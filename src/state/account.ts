import { createLocalStorageState } from "@/util/rxjs";
import { state } from "@react-rxjs/core";
import type { Enum, SS58String } from "polkadot-api";
import {
  getInjectedExtensions,
  type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import {
  concat,
  filter,
  interval,
  map,
  switchMap,
  take,
  timer,
  type ObservableInput,
} from "rxjs";

export type AccountSource = Enum<{
  extension: {
    id: string;
    address: string;
  };
  address: SS58String;
}>;

export const [accountSource$, setAccountSource] =
  createLocalStorageState<AccountSource | null>("account-src", null);

export type Account = Enum<{
  extension: InjectedPolkadotAccount;
  address: SS58String;
}>;

export const selectedAccount$ = state(
  accountSource$.pipe(
    switchMap((v): ObservableInput<Account | null> => {
      if (v == null) return [null];

      if (v.type === "address") {
        return [v];
      }

      return [null];
    })
  )
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
