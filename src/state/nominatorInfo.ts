import {
  type CodecType,
  compactBn,
  enhanceCodec,
  Struct,
  Tuple,
  Vector,
} from "@polkadot-api/substrate-bindings"
import { shareLatest } from "@react-rxjs/core"
import { AccountId, type SS58String } from "polkadot-api"
import {
  catchError,
  combineLatest,
  concat,
  defer,
  filter,
  finalize,
  firstValueFrom,
  from,
  fromEvent,
  map,
  merge,
  mergeMap,
  Observable,
  partition,
  share,
  Subject,
  switchMap,
  take,
} from "rxjs"
import {
  onProviderMsg$,
  onWorkerMsg$,
  selectedChain$,
  stakingApi$,
  useSmoldot$,
} from "./chain"
import { indexerUrl } from "./chainConfig"
import { activeEraNumber$ } from "./era"
import {
  type NominatorRewardsResult,
  type NominatorValidatorsResult,
  type Request,
  type Response,
} from "./rewards.worker"
import RewardsWorker from "./rewards.worker?worker"

const worker = new RewardsWorker()
const workerMsgs = fromEvent<MessageEvent<Response>>(worker, "message").pipe(
  map((evt) => evt.data),
  share(),
)
const [rpcTo$, message$] = partition(workerMsgs, (x) => x.type === "rpcTo")

export interface NominatorRequest {
  type: "getNominatorRewards" | "getNominatorActiveValidators"
  value: {
    address: SS58String
    era: number
  }
}

rpcTo$.subscribe((msg) => onWorkerMsg$.next(msg.value))
onProviderMsg$.subscribe((value) =>
  worker.postMessage({ type: "rpcFrom", value }),
)

let workerReqId = 0
const throughWorker = <T>(msg: NominatorRequest) =>
  defer(() => {
    const id = workerReqId++
    worker.postMessage({
      type: msg.type,
      value: {
        ...msg.value,
        id,
      },
    } satisfies Request)

    return message$.pipe(
      filter((v) => v.type === "result" && v.value.id === id),
      map((v) => v.value!.result as T),
      take(1),
    )
  })

const sendToWorker = <T>(
  type: NominatorRequest["type"],
  address: SS58String,
  eras: Observable<number>,
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
            console.error(ex)
            return [{ era, result: null }]
          }),
        ),
      3,
    ),
  )

/// indexer
const indexerCodec$ = stakingApi$.pipe(
  switchMap((api) => api.constants.System.SS58Prefix()),
  map((ss58Format: number) => {
    const nomRewardCodec = Struct({
      reward: compactBn,
      bond: compactBn,
      commission: compactBn,
    })

    const byValidator = enhanceCodec(
      Vector(Tuple(AccountId(ss58Format), nomRewardCodec)),
      Object.entries as (
        x: Record<SS58String, CodecType<typeof nomRewardCodec>>,
      ) => Array<[SS58String, CodecType<typeof nomRewardCodec>]>,
      Object.fromEntries,
    )

    const [, nominatorsRewardDec] = Struct({
      total: compactBn,
      totalCommission: compactBn,
      activeBond: compactBn,
      byValidator,
    })

    return nominatorsRewardDec
  }),
  shareLatest(),
)

const fetchCache = new Map<string, Promise<Uint8Array | null>>()
const getIndexerNominatorFile = (address: SS58String, era: number) => {
  const key = `${address}-${era}`
  if (!fetchCache.has(key)) {
    fetchCache.set(
      key,
      firstValueFrom(
        selectedChain$.pipe(
          switchMap((chain) => fetch(`${indexerUrl[chain]}/${era}/${address}`)),
          switchMap((response) => {
            if (response.status >= 400) throw new Error(response.statusText)
            return response.bytes()
          }),
          catchError(() => [null]),
        ),
      ),
    )
  }
  return fetchCache.get(key)!
}

const eraIndexedCache = new Map<number, Promise<boolean>>()
const isEraIndexed = (era: number) => {
  if (!eraIndexedCache.has(era)) {
    eraIndexedCache.set(
      era,
      firstValueFrom(
        selectedChain$.pipe(
          switchMap((chain) => fetch(`${indexerUrl[chain]}/${era}/done`)),
          switchMap((response) => {
            if (response.status >= 400) throw new Error(response.statusText)
            return [true]
          }),
          catchError(() => [false]),
        ),
      ),
    )
  }
  return eraIndexedCache.get(era)!
}

const getNominatorRewardsFromWorker = (
  address: SS58String,
  eras$: Observable<number>,
) => sendToWorker<NominatorRewardsResult>("getNominatorRewards", address, eras$)

export const getNominatorRewards = (
  address: SS58String,
  eras: number[],
): Observable<{
  era: number
  result: NominatorRewardsResult | null
}> =>
  combineLatest([activeEraNumber$, useSmoldot$, indexerCodec$]).pipe(
    take(1),
    switchMap(([activeEra, useSmoldot, codec]) => {
      if (useSmoldot)
        return getNominatorRewardsFromWorker(
          address,
          from(eras.filter((e) => e <= activeEra)),
        )

      const aboveActiveEra = eras.filter((e) => e >= activeEra)
      const belowActiveEra = eras.filter((e) => e < activeEra)

      const failedEras$ = new Subject<number>()
      const worker$ = getNominatorRewardsFromWorker(
        address,
        concat(from(aboveActiveEra), failedEras$),
      )

      const indexer$ = merge(
        ...belowActiveEra.map((era) =>
          from(isEraIndexed(era)).pipe(
            switchMap((isIndexed) => {
              if (!isIndexed) {
                failedEras$.next(era)
                return []
              }
              return getIndexerNominatorFile(address, era)
            }),
            map((result) => ({ era, result: result ? codec(result) : null })),
            catchError((ex) => {
              console.error(ex)
              failedEras$.next(era)
              return []
            }),
          ),
        ),
      ).pipe(
        finalize(() => {
          failedEras$.complete()
        }),
      )

      return merge(worker$, indexer$)
    }),
  )

export const getNominatorValidators = (address: SS58String, eras: number[]) =>
  getNominatorRewards(address, eras).pipe(
    map(
      ({
        era,
        result,
      }): {
        era: number
        result: NominatorValidatorsResult | null
      } => ({
        era,
        result: result
          ? Object.entries(result.byValidator).map(([validator, { bond }]) => ({
              validator,
              activeBond: bond,
            }))
          : null,
      }),
    ),
  )
