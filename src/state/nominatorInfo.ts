import {
  type CodecType,
  compactBn,
  enhanceCodec,
  Struct,
  Tuple,
  Vector,
} from "@polkadot-api/substrate-bindings";
import { shareLatest } from "@react-rxjs/core";
import { AccountId, type SS58String } from "polkadot-api";
import {
  catchError,
  concat,
  defer,
  filter,
  finalize,
  firstValueFrom,
  from,
  fromEvent,
  iif,
  map,
  merge,
  mergeMap,
  Observable,
  Subject,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { selectedChain$, stakingApi$ } from "./chain";
import { indexerUrl } from "./chainConfig";
import { activeEraNumber$ } from "./era";
import {
  type NominatorRewardsResult,
  type NominatorValidatorsResult,
  type Request,
  type Response,
} from "./rewards.worker";
import RewardsWorker from "./rewards.worker?worker";

const worker = new RewardsWorker();
const message$ = fromEvent<MessageEvent<Response>>(worker, "message").pipe(
  map((evt) => evt.data)
);

export interface NominatorRequest {
  type: "getNominatorRewards" | "getNominatorActiveValidators";
  value: {
    address: SS58String;
    era: number;
  };
}

export const getNominatorRewards = (address: SS58String, eras: number[]) =>
  iif(
    () => indexerFailed,
    sendToWorker<NominatorRewardsResult>(
      "getNominatorRewards",
      address,
      from(eras)
    ),
    getNominatorRewardsThroughIndexer(address, eras)
  );

export const getNominatorValidators = (address: SS58String, eras: number[]) =>
  iif(
    () => indexerFailed,
    sendToWorker<NominatorValidatorsResult>(
      "getNominatorActiveValidators",
      address,
      from(eras)
    ),
    getNominatorValidatorsThroughIndexer(address, eras)
  );

/// worker
let activated = false;
function activateWorker() {
  if (activated) return;
  activated = true;

  merge(
    message$.pipe(
      filter((v) => v.type === "ready"),
      switchMap(() => selectedChain$),
      take(1)
    ),
    selectedChain$
  ).subscribe((value) =>
    worker.postMessage({
      type: "setChain",
      value,
    } satisfies Request)
  );
}

let workerReqId = 0;
const throughWorker = <T>(msg: NominatorRequest) =>
  defer(() => {
    activateWorker();

    const id = workerReqId++;
    worker.postMessage({
      type: msg.type,
      value: {
        ...msg.value,
        id,
      },
    } satisfies Request);

    return message$.pipe(
      filter((v) => v.type === "result" && v.value.id === id),
      map((v) => v.value!.result as T),
      take(1)
    );
  });

const sendToWorker = <T>(
  type: NominatorRequest["type"],
  address: SS58String,
  eras: Observable<number>
) =>
  eras.pipe(
    mergeMap(
      (era) =>
        throughWorker<T>({
          type,
          value: { address, era },
        }).pipe(
          map((result) => ({ era, result })),
          catchError((ex) => {
            console.error(ex);
            return [{ era, result: null }];
          })
        ),
      3
    )
  );

/// indexer
let indexerFailed = false;
let successes = 0;
let fails = 0;
const registerSuccess = () => {
  successes++;
};
const registerFail = () => {
  fails++;
  if (!indexerFailed && fails > successes + 10) {
    indexerFailed = true;
    setTimeout(() => {
      indexerFailed = false;
      successes = 0;
      fails = 0;
    }, 60_000);
  }
};

const indexerCodec$ = stakingApi$.pipe(
  switchMap((api) => api.constants.System.SS58Prefix()),
  map((ss58Format: number) => {
    const nomRewardCodec = Struct({
      reward: compactBn,
      bond: compactBn,
      commission: compactBn,
    });

    const byValidator = enhanceCodec(
      Vector(Tuple(AccountId(ss58Format), nomRewardCodec)),
      Object.entries as (
        x: Record<SS58String, CodecType<typeof nomRewardCodec>>
      ) => Array<[SS58String, CodecType<typeof nomRewardCodec>]>,
      Object.fromEntries
    );

    const [, nominatorsRewardDec] = Struct({
      total: compactBn,
      totalCommission: compactBn,
      activeBond: compactBn,
      byValidator,
    });

    return nominatorsRewardDec;
  }),
  shareLatest()
);

const fetchCache = new Map<string, Promise<Uint8Array | null>>();
const getIndexerNominatorFile = (address: SS58String, era: number) => {
  const key = `${address}-${era}`;
  if (!fetchCache.has(key)) {
    fetchCache.set(
      key,
      firstValueFrom(
        selectedChain$.pipe(
          switchMap((chain) => fetch(`${indexerUrl[chain]}/${era}/${address}`)),
          switchMap((response) => {
            if (response.status >= 400) throw new Error(response.statusText);
            return response.bytes();
          }),
          catchError(() => [null])
        )
      )
    );
  }
  return fetchCache.get(key)!;
};

const getNominatorRewardsThroughIndexer = (
  address: SS58String,
  eras: number[]
): Observable<{
  era: number;
  result: NominatorRewardsResult | null;
}> =>
  activeEraNumber$.pipe(
    take(1),
    switchMap((activeEra) => {
      const aboveActiveEra = eras.filter((e) => e >= activeEra);
      const belowActiveEra = eras.filter((e) => e < activeEra);

      const failedEras$ = new Subject<number>();
      const workerEras$ = concat(from(aboveActiveEra), failedEras$);

      const worker$ = sendToWorker<NominatorRewardsResult>(
        "getNominatorRewards",
        address,
        workerEras$
      );
      const indexer$ = merge(
        ...belowActiveEra.map((era) =>
          getIndexerNominatorFile(address, era).then((result) => ({
            era,
            result,
          }))
        )
      ).pipe(
        filter((v) => {
          if (!v.result) {
            failedEras$.next(v.era);
            registerFail();
            return false;
          }
          registerSuccess();
          return true;
        }),
        withLatestFrom(indexerCodec$),
        map(([{ era, result }, codec]) => ({
          era,
          result: codec(result!),
        })),
        finalize(() => {
          failedEras$.complete();
        })
      );

      return merge(worker$, indexer$);
    })
  );

const getNominatorValidatorsThroughIndexer = (
  address: SS58String,
  eras: number[]
) =>
  getNominatorRewardsThroughIndexer(address, eras).pipe(
    map(
      ({
        era,
        result,
      }): {
        era: number;
        result: NominatorValidatorsResult | null;
      } => ({
        era,
        result: result
          ? Object.entries(result.byValidator).map(([validator, { bond }]) => ({
              validator,
              activeBond: bond,
            }))
          : null,
      })
    )
  );
