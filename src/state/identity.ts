import { state } from "@react-rxjs/core";
import { type SS58String } from "polkadot-api";
import { from, map, startWith, tap } from "rxjs";
import { identitySdk } from "./chain";

const CACHE_KEY = "identity-cache";
const cache: Record<
  SS58String,
  { value: string; verified: boolean; subId?: string } | undefined
> = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");

export const identity$ = state((address: SS58String) => {
  const defaultValue = cache[address] ?? null;
  return from(identitySdk.getIdentity(address)).pipe(
    map((v) =>
      v?.info.display
        ? {
            value: v.info.display,
            verified: v.verified,
            subId: v.subIdentity,
          }
        : null
    ),
    tap((v) => {
      if (v != null) {
        cache[address] = v;
      } else {
        delete cache[address];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }),
    startWith(defaultValue)
  );
}, null);
