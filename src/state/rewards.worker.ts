import { createStakingSdk, type StakingSdk } from "@polkadot-api/sdk-staking"
import { createClient, Enum, type SS58String } from "polkadot-api"
import { type JsonRpcProvider } from "polkadot-api/ws-provider"
import {
  filter,
  fromEvent,
  map,
  mergeMap,
  partition,
} from "rxjs"

export type Request = Enum<{
  rpc: string,
  getNominatorRewards: {
    id: number
    address: SS58String
    era: number
  }
  getNominatorActiveValidators: {
    id: number
    address: SS58String
    era: number
  }
}>

export type NominatorRewardsResult = Awaited<
  ReturnType<StakingSdk["getNominatorRewards"]>
>
export type NominatorValidatorsResult = Awaited<
  ReturnType<StakingSdk["getNominatorActiveValidators"]>
>
export type Response = Enum<{
  rpc: string,
  result: {
    id: number
    result: NominatorRewardsResult | NominatorValidatorsResult
  }
  ready: undefined
}>


const [rpc$, message$] = partition(fromEvent<MessageEvent<Request>>(globalThis, "message").pipe(
  map((v) => v.data),
), x => x.type === 'rpc')

const provider: JsonRpcProvider = (onMsg) => {
  const subscription = rpc$.subscribe(x => onMsg(x.value))
  return {
    send: value => globalThis.postMessage({type:'rpc', value}),
    disconnect() {
      subscription.unsubscribe()
    }
  }
}

const sdk = createStakingSdk(createClient(provider))

message$
  .pipe(
    filter((v) => v.type === "getNominatorRewards"),
    mergeMap(
      async (
        {
          value: { address, era, id },
        },
      ) => {
        const result = await sdk.getNominatorRewards(address, era)
        return { type: "result", value: { id, result } } satisfies Response
      },
    ),
  )
  .subscribe((v) => globalThis.postMessage(v))

message$
  .pipe(
    filter((v) => v.type === "getNominatorActiveValidators"),
    mergeMap(
      async (
        {
          value: { address, era, id },
        },
      ) => {
        const result = await sdk.getNominatorActiveValidators(address, era)
        return { type: "result", value: { id, result } } satisfies Response
      },
    ),
  )
  .subscribe((v) => globalThis.postMessage(v))

globalThis.postMessage({
  type: "ready",
  value: undefined,
} satisfies Response)
