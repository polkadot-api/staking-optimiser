import {
  type CodecType,
  compactBn,
  enhanceCodec,
  Struct,
  Tuple,
  Vector,
} from "@polkadot-api/substrate-bindings";
import { AccountId, type SS58String } from "polkadot-api";
import { defer, filter, firstValueFrom, fromEvent, map, switchMap } from "rxjs";
import { selectedChain$, stakingApi$ } from "./chain";
import { indexerUrl } from "./chainConfig";
import {
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

let workerReqId = 0;
const throughWorker = <T>(msg: NominatorRequest) =>
  firstValueFrom(
    defer(() => {
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
        map((v) => v.value!.result as T)
      );
    })
  );

message$
  .pipe(
    filter((v) => v.type === "ready"),
    switchMap(() => selectedChain$)
  )
  .subscribe((value) =>
    worker.postMessage({
      type: "setChain",
      value,
    } satisfies Request)
  );

const getIndexerCodec = (ss58Format: number) => {
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
};

const throughIndexer = async <T>(msg: NominatorRequest) => {
  const chain = await firstValueFrom(selectedChain$);
  const api = await firstValueFrom(stakingApi$);
  const ss58Format = await api.constants.System.SS58Prefix();

  const response = await fetch(
    `${indexerUrl[chain]}/${msg.value.era}/${msg.value.address}`
  );

  if (response.status >= 400) {
    throw new Error(response.statusText);
  }
  const payload = await response.bytes();

  const codec = getIndexerCodec(ss58Format);
  const decoded = codec(payload);
  if (msg.type === "getNominatorActiveValidators") {
    const validators: NominatorValidatorsResult = Object.entries(
      decoded.byValidator
    ).map(([validator, { bond }]) => ({
      validator,
      activeBond: bond,
    }));
    return validators as T;
  }
  return decoded as T;
};

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

export const requestNominator = <T>(msg: NominatorRequest) =>
  indexerFailed
    ? throughWorker<T>(msg)
    : throughIndexer<T>(msg)
        .then((r) => {
          registerSuccess();
          return r;
        })
        .catch((err) => {
          console.error(err);
          console.log("failed at", msg);
          registerFail();
          return throughWorker<T>(msg);
        });
