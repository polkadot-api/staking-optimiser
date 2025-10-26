import { state } from "@react-rxjs/core";
import type { PolkadotSigner, SS58String } from "polkadot-api";
import { createPjsWalletProvider, createSelectedAccountPlugin } from "polkahub";
import { combineLatest, map, switchMap } from "rxjs";
import { stakingSdk$ } from "./chain";

export const selectedAccountPlugin = createSelectedAccountPlugin();
export const pjsWalletProvider = createPjsWalletProvider({});

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
