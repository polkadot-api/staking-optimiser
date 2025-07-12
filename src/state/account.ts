import { state } from "@react-rxjs/core";
import type { Enum, SS58String } from "polkadot-api";
import {
  getInjectedExtensions,
  type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { concat, filter, interval, map, of, take, timer } from "rxjs";

export type Account = Enum<{
  extension: InjectedPolkadotAccount;
  address: SS58String;
}>;

export const selectedAccount$ = state<Account | null>(
  of<Account | null>({
    type: "address",
    value: "13UVJyLnbVp8c4FQeiGRMVBP7xph2wHCuf2RzvyxJomXJ7RL",
  })
);

export const selectedAccountAddr$ = selectedAccount$.pipeState(
  map((v) =>
    v?.type === "address"
      ? v.value
      : v?.type === "extension"
        ? v.value.address
        : null
  )
);

export const availableExtensions$ = state(
  concat(
    timer(0, 100).pipe(
      map(getInjectedExtensions),
      filter((v) => v.length > 0),
      take(1)
    ),
    interval(2000).pipe(map(getInjectedExtensions))
  ),
  []
);
