import { state } from "@react-rxjs/core";
import type { PolkadotSigner, SS58String } from "polkadot-api";
import {
  createLedgerProvider,
  createPjsWalletProvider,
  createPolkadotVaultProvider,
  createReadOnlyProvider,
  createSelectedAccountPlugin,
} from "polkahub";
import { combineLatest, firstValueFrom, map, switchMap, take } from "rxjs";
import { selectedChain$, stakingApi$, stakingSdk$ } from "./chain";
import { tokenDecimalsByChain, tokenSymbolByChain } from "./chainConfig";

const selectedAccountPlugin = createSelectedAccountPlugin();
const pjsWalletProvider = createPjsWalletProvider({});
const polkadotVaultProvider = createPolkadotVaultProvider();
const readOnlyProvider = createReadOnlyProvider();
const ledgerAccountProvider = createLedgerProvider(
  async () => {
    const module = await import("@ledgerhq/hw-transport-webhid");
    return module.default.create();
  },
  () =>
    firstValueFrom(
      combineLatest({
        chain: selectedChain$,
        // ledger: [ledger],
        // deviceId: ledger.ledgerSigner.deviceId(),
        ss58Format: stakingApi$.pipe(
          switchMap((v) => v.constants.System.SS58Prefix()),
          take(1)
        ),
      }).pipe(
        map(({ chain, ss58Format }) => ({
          decimals: tokenDecimalsByChain[chain],
          tokenSymbol: tokenSymbolByChain[chain],
          ss58Format,
        }))
      )
    )
);

export const accountProviderPlugins = [
  selectedAccountPlugin,
  pjsWalletProvider,
  polkadotVaultProvider,
  readOnlyProvider,
  ledgerAccountProvider,
];

export type SignerAccount = {
  address: SS58String;
  polkadotSigner: PolkadotSigner;
};
export const selectedSignerAccount$ =
  selectedAccountPlugin.selectedAccount$.pipeState(
    map((v): SignerAccount | null => {
      if (!v?.signer) return null;

      return {
        address: v.address,
        polkadotSigner: v.signer,
      };
    })
  );

export const selectedAccountAddr$ =
  selectedAccountPlugin.selectedAccount$.pipeState(
    map((v): SS58String | null => v?.address ?? null)
  );

export const accountStatus$ = state(
  combineLatest([stakingSdk$, selectedAccountAddr$]).pipe(
    switchMap(([sdk, addr]) => {
      if (!addr) return [null];

      return sdk.getAccountStatus$(addr);
    })
  )
);
