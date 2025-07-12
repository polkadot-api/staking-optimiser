import { createLocalStorageState } from "@/util/rxjs";
import { state } from "@react-rxjs/core";
import { combineKeys } from "@react-rxjs/utils";
import type { Enum, SS58String } from "polkadot-api";
import {
  connectInjectedExtension,
  getInjectedExtensions,
  type InjectedExtension,
  type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import {
  catchError,
  concat,
  defer,
  filter,
  fromEventPattern,
  ignoreElements,
  interval,
  map,
  NEVER,
  retry,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
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

export const [connectedExtensions$, setConnectedExtensions] =
  createLocalStorageState<string[]>("connected-ext", []);

const extension$ = state((name: string) => {
  const connect$ = availableExtensions$.pipe(
    // Wait for the extension to be available
    filter((extensions) => extensions.includes(name)),
    take(1),
    switchMap(() =>
      defer(() => connectInjectedExtension(name)).pipe(
        // PolkadotJS rejects the promise straight away instead of waiting for user input
        retry({
          delay(error) {
            if (error?.message.includes("pending authorization request")) {
              return timer(1000);
            }
            throw error;
          },
        }),
        switchMap((ext) =>
          fromEventPattern(ext.subscribe, (hd) => hd()).pipe(
            map(() => ext),
            startWith(ext)
          )
        )
      )
    ),
    catchError((e) => {
      console.error(e);
      // Deselect the extension that failed to connect
      return connectedExtensions$.pipe(
        take(1),
        tap((ext) => {
          setConnectedExtensions(ext.filter((v) => v !== name));
        }),
        ignoreElements()
      );
    })
  );

  return defer(() => {
    let disconnected = false;
    let extension: InjectedExtension | null = null;
    return concat(connect$, NEVER).pipe(
      tap({
        next(value) {
          if (value) {
            if (disconnected) {
              console.log("disconnect just after connecting");
              value.disconnect();
            } else {
              extension = value;
            }
          }
        },
        unsubscribe() {
          if (extension) {
            console.log("disconnect because of cleanup");
            extension.disconnect();
          } else {
            disconnected = true;
          }
        },
      })
    );
  });
});

export const injectedExtensions$ = state(
  combineKeys(connectedExtensions$, extension$).pipe(
    // Prevent getting it ref-counted, as it disconnects from the extensions
    shareReplay(1)
  )
);

export const connectedExtensionsAccounts$ = injectedExtensions$.pipeState(
  map((extensions) =>
    Array.from(extensions.entries()).map(([id, extension]) => ({
      id,
      extension,
      accounts: extension.getAccounts(),
    }))
  )
);

export const selectedAccount$ = state(
  accountSource$.pipe(
    switchMap((v): ObservableInput<Account | null> => {
      if (v == null) return [null];

      if (v.type === "address") {
        return [v];
      }

      const res = extension$(v.value.id).pipe(
        map((ext): Account | null => {
          const account = ext
            .getAccounts()
            .find((acc) => acc.address === v.value.address);
          return account
            ? {
                type: "extension",
                value: account,
              }
            : null;
        }),
        // In case the extension doesn't exist, don't halt
        startWith(null)
      );
      return res;
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
