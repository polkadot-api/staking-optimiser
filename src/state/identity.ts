import { state } from "@react-rxjs/core"
import { type SS58String } from "polkadot-api"
import { firstValueFrom, map, startWith, switchMap, tap } from "rxjs"
import { identitySdk$ } from "./chain"

const CACHE_KEY = "identity-cache"
const cache: Record<
  SS58String,
  { displayName: string; verified: boolean; subId?: string } | undefined
> = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}")

export const identity$ = state((address: SS58String) => {
  const defaultValue = cache[address] ?? null
  return identitySdk$.pipe(
    switchMap((identitySdk) => identitySdk.getIdentity(address)),
    map((v) =>
      v?.info.display
        ? {
            displayName: v.info.display,
            verified: v.verified,
            subId: v.subIdentity,
          }
        : null,
    ),
    tap((v) => {
      if (v != null) {
        cache[address] = v
      } else {
        delete cache[address]
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    }),
    defaultValue ? startWith(defaultValue) : (v) => v,
  )
})

export const getAddressIdentity = (address: SS58String) =>
  identity$(address).pipe(
    map((v) =>
      v
        ? {
            ...v,
            name: v.displayName ?? (v as any).value,
          }
        : null,
    ),
  )
