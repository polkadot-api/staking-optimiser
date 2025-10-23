import { createLocalStorageState } from "@/util/rxjs";
import { AccountId, type PolkadotSigner, type SS58String } from "polkadot-api";
import { firstValueFrom, switchMap } from "rxjs";
import { selectedChain$, stakingApi$ } from "./chain";
import { tokenDecimalsByChain, tokenSymbolByChain } from "./chainConfig";

async function initializeLedgerSigner() {
  const bufferModule = await import("buffer");
  globalThis.Buffer = bufferModule.Buffer;

  const [ledgerModule, signerModule] = await Promise.all([
    import("@ledgerhq/hw-transport-webhid"),
    import("@polkadot-api/ledger-signer"),
  ]);
  const TransportWebHID = ledgerModule.default;

  const transport = await TransportWebHID.create();
  try {
    const ledgerSigner = new signerModule.LedgerSigner(transport);

    return { ledgerSigner, transport };
  } catch (ex) {
    transport.close();
    throw ex;
  }
}

export interface LedgerAccount {
  address: SS58String;
  deviceId: number;
  index: number;
}
export const [ledgerAccounts$, setLedgerAccounts] = createLocalStorageState(
  "ledger-acc",
  [] as LedgerAccount[]
);

export const getLedgerAccount = async (
  index: number
): Promise<LedgerAccount> => {
  const { ledgerSigner, transport } = await initializeLedgerSigner();
  try {
    const [deviceId, publicKey, ss58Format] = await Promise.all([
      ledgerSigner.deviceId(),
      ledgerSigner.getPubkey(index),
      firstValueFrom(
        stakingApi$.pipe(switchMap((v) => v.constants.System.SS58Prefix()))
      ),
    ]);

    return {
      address: AccountId(ss58Format).dec(publicKey),
      deviceId,
      index,
    };
  } finally {
    transport.close();
  }
};

export const createLedgerSigner = (account: LedgerAccount): PolkadotSigner => {
  const publicKey = AccountId().enc(account.address);

  const operateWithSigner = async <R>(
    cb: (signer: PolkadotSigner) => Promise<R>
  ) => {
    const { ledgerSigner, transport } = await initializeLedgerSigner();
    try {
      const chain = await firstValueFrom(selectedChain$);

      const signer = await ledgerSigner.getPolkadotSigner(
        {
          decimals: tokenDecimalsByChain[chain],
          tokenSymbol: tokenSymbolByChain[chain],
        },
        account.index
      );
      if (!pkAreEq(publicKey, signer.publicKey)) {
        throw new Error("Device mismatch");
      }

      console.log("Cb");
      return await cb(signer);
    } finally {
      transport.close();
    }
  };

  return {
    publicKey,
    signBytes: (...args) =>
      operateWithSigner((signer) => signer.signBytes(...args)),
    signTx: (...args) => operateWithSigner((signer) => signer.signTx(...args)),
  };
};

const pkAreEq = (a: Uint8Array, b: Uint8Array) => a.every((v, i) => b[i] === v);
