import { createStakingSdk, type StakingSdk } from "@polkadot-api/sdk-staking"
import { createClient, Enum, type SS58String } from "polkadot-api"
import { type JsonRpcProvider } from "polkadot-api"
import { filter, fromEvent, map, mergeMap, partition, share } from "rxjs"

export type Request = Enum<{
  rpcFrom: string
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
  rpcTo: string
  result: {
    id: number
    result: NominatorRewardsResult | NominatorValidatorsResult
  }
  ready: undefined
}>

const mainMsgs$ = fromEvent<MessageEvent<Request>>(globalThis, "message").pipe(
  map((v) => v.data),
  share(),
)
const [rpc$, message$] = partition(mainMsgs$, (x) => x.type === "rpcFrom")

const provider: JsonRpcProvider = (onMsg) => {
  const subscription = rpc$.subscribe((x) => {
    onMsg(JSON.parse(x.value))
  })
  return {
    send: (value) => {
      globalThis.postMessage({ type: "rpcTo", value: JSON.stringify(value) })
    },
    disconnect() {
      subscription.unsubscribe()
    },
  }
}

let sdk: StakingSdk
const getSdk = () => (sdk ||= createStakingSdk(createClient(provider)))

message$
  .pipe(
    filter((v) => v.type === "getNominatorRewards"),
    mergeMap(async ({ value: { address, era, id } }) => {
      const result = await getSdk().getNominatorRewards(address, era)
      return { type: "result", value: { id, result } } satisfies Response
    }),
  )
  .subscribe((v) => globalThis.postMessage(v))

message$
  .pipe(
    filter((v) => v.type === "getNominatorActiveValidators"),
    mergeMap(async ({ value: { address, era, id } }) => {
      const result = await getSdk().getNominatorActiveValidators(address, era)
      return { type: "result", value: { id, result } } satisfies Response
    }),
  )
  .subscribe((v) => globalThis.postMessage(v))

globalThis.postMessage({
  type: "ready",
  value: undefined,
} satisfies Response)
