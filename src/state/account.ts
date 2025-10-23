import { createLocalStorageState } from "@/util/rxjs";
import { getPublicKey } from "@/util/ss58";
import { state } from "@react-rxjs/core";
import { combineKeys } from "@react-rxjs/utils";
import type { Enum, PolkadotSigner, SS58String } from "polkadot-api";
import {
  connectInjectedExtension,
  getInjectedExtensions,
  type InjectedExtension,
  type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { getPolkadotSigner } from "polkadot-api/signer";
import {
  catchError,
  combineLatest,
  concat,
  defer,
  endWith,
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
  takeUntil,
  tap,
  timer,
  type ObservableInput,
} from "rxjs";
import { stakingSdk$ } from "./chain";
import { USE_CHOPSTICKS } from "./chainConfig";
import {
  createLedgerSigner,
  ledgerAccounts$,
  type LedgerAccount,
} from "./ledger";
import { readOnlyAddresses$ } from "./readonly";
import { createVaultSigner, vaultAccounts$, type VaultAccount } from "./vault";

export type AccountSource = Enum<{
  extension: {
    id: string;
    address: string;
  };
  address: SS58String;
  vault: VaultAccount;
  ledger: LedgerAccount;
}>;

export const [accountSource$, setAccountSource] =
  createLocalStorageState<AccountSource | null>("account-src", null);

export type Account = Enum<{
  extension: InjectedPolkadotAccount;
  address: SS58String;
  vault: VaultAccount;
  ledger: LedgerAccount;
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

export const availableSources$ = state(
  combineLatest({
    readOnly: readOnlyAddresses$.pipe(
      map((v) =>
        v.map(
          (address): AccountSource => ({
            type: "address",
            value: address,
          })
        )
      )
    ),
    extensions: connectedExtensionsAccounts$.pipe(
      map((extensions) =>
        Object.fromEntries(
          extensions.map(({ id, accounts }): [string, AccountSource[]] => [
            id,
            accounts.map(
              (account): AccountSource => ({
                type: "extension",
                value: {
                  id,
                  address: account.address,
                },
              })
            ),
          ])
        )
      )
    ),
    vault: vaultAccounts$.pipe(
      map((v) =>
        v.map(
          (address): AccountSource => ({
            type: "vault",
            value: address,
          })
        )
      )
    ),
    ledger: ledgerAccounts$.pipe(
      map((v) =>
        v.map(
          (value): AccountSource => ({
            type: "ledger",
            value,
          })
        )
      )
    ),
  }).pipe(
    map(
      ({ extensions, ...rest }): Record<string, AccountSource[]> => ({
        ...extensions,
        ...rest,
      })
    )
  )
);

const deselectWhenRemoved$ = (
  value$: ObservableInput<Account | null>,
  source: AccountSource
) =>
  concat(value$, NEVER).pipe(
    takeUntil(
      availableSources$.pipe(
        map((v) => Object.values(v).flat()),
        filter((sources) => {
          switch (source.type) {
            case "address":
              return !sources.find(
                (src) => src.type === "address" && src.value === source.value
              );
            case "vault":
              return !sources.find(
                (src) =>
                  src.type === "vault" &&
                  src.value.address === source.value.address
              );
            case "extension":
              return !sources.find(
                (src) =>
                  src.type === "extension" &&
                  src.value.id === source.value.id &&
                  src.value.address === source.value.address
              );
            case "ledger":
              return !sources.find(
                (src) =>
                  src.type === "ledger" &&
                  src.value.deviceId === source.value.deviceId &&
                  src.value.index === source.value.index &&
                  src.value.address === source.value.address
              );
          }
        })
      )
    ),
    endWith(null)
  );

export const selectedAccount$ = state(
  accountSource$.pipe(
    switchMap((v): ObservableInput<Account | null> => {
      if (v == null) return [null];

      if (v.type === "address" || v.type === "vault" || v.type === "ledger") {
        return deselectWhenRemoved$([v], v);
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
      return deselectWhenRemoved$(res, v);
    })
  )
);

const fakeSigner = (address: SS58String) =>
  getPolkadotSigner(getPublicKey(address)!, "Sr25519", () => {
    // From https://wiki.acala.network/build/sdks/homa
    const signature = new Uint8Array(64);
    signature.fill(0xcd);
    signature.set([0xde, 0xad, 0xbe, 0xef]);
    return signature;
  });

export type SignerAccount = {
  address: SS58String;
  polkadotSigner: PolkadotSigner;
};
export const selectedSignerAccount$ = selectedAccount$.pipeState(
  map((v): SignerAccount | null => {
    if (!v) return null;

    switch (v.type) {
      case "address":
        return USE_CHOPSTICKS
          ? {
              address: v.value,
              polkadotSigner: fakeSigner(v.value),
            }
          : null;
      case "extension":
        return v.value;
      case "vault":
        return {
          address: v.value.address,
          polkadotSigner: createVaultSigner(v.value),
        };
      case "ledger":
        return {
          address: v.value.address,
          polkadotSigner: createLedgerSigner(v.value),
        };
    }
  })
);

export const selectedAccountAddr$ = selectedAccount$.pipeState(
  map((v): SS58String | null => {
    if (!v) return null;

    switch (v.type) {
      case "address":
        return v.value;
      case "vault":
      case "extension":
      case "ledger":
        return v.value.address;
    }
  })
);

export const accountStatus$ = state(
  combineLatest([stakingSdk$, selectedAccountAddr$]).pipe(
    switchMap(([sdk, addr]) => {
      if (!addr) return [null];

      return sdk.getAccountStatus$(addr).pipe(startWith(null));
    })
  )
);
