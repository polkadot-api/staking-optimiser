import { createLocalStorageState } from "@/util/rxjs";
import type Transport from "@ledgerhq/hw-transport";
import { AccountId, type PolkadotSigner, type SS58String } from "polkadot-api";
import {
  catchError,
  combineLatest,
  concatMap,
  defer,
  finalize,
  firstValueFrom,
  from,
  Observable,
  switchMap,
  take,
} from "rxjs";
import { selectedChain$, stakingApi$ } from "./chain";
import { tokenDecimalsByChain, tokenSymbolByChain } from "./chainConfig";

export class AlreadyInUseError extends Error {
  constructor() {
    super("Device already in use");
  }
}

let usingLedger = false;
async function initializeLedgerSigner() {
  // return new Promise(() => {});
  const bufferModule = await import("buffer");
  globalThis.Buffer = bufferModule.Buffer;

  const [ledgerModule, signerModule] = await Promise.all([
    import("@ledgerhq/hw-transport-webhid"),
    import("@polkadot-api/ledger-signer"),
  ]);
  const TransportWebHID = ledgerModule.default;

  if (usingLedger) throw new AlreadyInUseError();
  usingLedger = true;

  let transport: Transport;
  try {
    transport = await TransportWebHID.create();
  } catch (ex) {
    usingLedger = false;
    throw ex;
  }

  const close = () => {
    usingLedger = false;
    transport.close();
  };
  try {
    const ledgerSigner = new signerModule.LedgerSigner(transport);

    return { ledgerSigner, transport, close };
  } catch (ex) {
    close();
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

export const getLedgerAccounts$ = (
  idxs: Array<number>
): Observable<LedgerAccount> =>
  defer(initializeLedgerSigner).pipe(
    switchMap((ledger) =>
      combineLatest({
        ledger: [ledger],
        deviceId: ledger.ledgerSigner.deviceId(),
        ss58Format: stakingApi$.pipe(
          switchMap((v) => v.constants.System.SS58Prefix()),
          take(1)
        ),
      }).pipe(
        catchError((ex) => {
          ledger.close();
          throw ex;
        })
      )
    ),
    switchMap(({ ledger, deviceId, ss58Format }) =>
      from(idxs).pipe(
        concatMap(async (idx) => {
          const pk = await ledger.ledgerSigner.getPubkey(idx);
          return {
            address: AccountId(ss58Format).dec(pk),
            deviceId,
            index: idx,
          };
        }),
        finalize(() => ledger.close())
      )
    )
  );

export const createLedgerSigner = (account: LedgerAccount): PolkadotSigner => {
  const publicKey = AccountId().enc(account.address);

  const operateWithSigner = async <R>(
    cb: (signer: PolkadotSigner) => Promise<R>
  ) => {
    const { ledgerSigner, close } = await initializeLedgerSigner();
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
      close();
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
