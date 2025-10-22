import { createLocalStorageState } from "@/util/rxjs";
import { createV4Tx } from "@polkadot-api/signers-common";
import {
  compact,
  decAnyMetadata,
  unifyMetadata,
  type HexString,
} from "@polkadot-api/substrate-bindings";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  Binary,
  getSs58AddressInfo,
  type PolkadotSigner,
  type SS58String,
} from "polkadot-api";
import { mergeUint8 } from "polkadot-api/utils";
import { firstValueFrom, map, merge, race } from "rxjs";

export interface VaultAccount {
  address: SS58String;
  genesis: HexString;
}
export const [vaultAccounts$, setVaultAccounts] = createLocalStorageState(
  "vault-acc",
  [] as VaultAccount[]
);

const [newTx$, setTx] = createSignal<Uint8Array>();
export const [scannedSignature$, setSignature] = createSignal<Uint8Array>();
export const [cancelledTx$, cancelTx] = createSignal();

export const activeTx$ = state(
  merge(newTx$, merge(scannedSignature$, cancelledTx$).pipe(map(() => null))),
  null
);
const currentScannedSignature$ = race(
  scannedSignature$,
  merge(newTx$, cancelledTx$).pipe(map(() => null))
);

// https://github.com/novasamatech/parity-signer/blob/738e34f0b60f86b718267cfe1ca766bd291640ed/docs/src/development/UOS.md
const VAULT_QR_HEADER = new Uint8Array([0x53]);
const VaultQrEncryption = {
  Ed25519: 0x00,
  Sr25519: 0x01,
  Ecdsa: 0x02,
  Unsigned: 0xff,
};
const VaultQrPayloadType = {
  LegacyTx: 0x00,
  Tx: 0x02,
  Message: 0x03,
  BulkTx: 0x04,
  LoadMetadataUpdate: 0x80,
  LoadTypesUpdate: 0x81,
  AddSpecsUpdate: 0xc1,
  DerivationsImport: 0xce,
};

const createQrTransaction = (
  encrpytion: number,
  publicKey: Uint8Array,
  callData: Uint8Array,
  extensions: Uint8Array,
  genesisHash: Uint8Array
) =>
  mergeUint8([
    VAULT_QR_HEADER,
    new Uint8Array([encrpytion]),
    new Uint8Array([VaultQrPayloadType.Tx]),
    publicKey,
    compact.enc(callData.length),
    callData,
    extensions,
    genesisHash,
  ]);

export const createVaultSigner = ({
  address,
  genesis,
}: VaultAccount): PolkadotSigner => {
  const info = getSs58AddressInfo(address);
  if (!info.isValid) {
    throw new Error("Invalid SS58 address " + address);
  }

  const publicKey = info.publicKey;

  return {
    publicKey,
    async signBytes(data) {
      return data;
    },
    async signTx(
      callData,
      signedExtensions,
      metadata,
      _atBlockNumber,
      _hasher
    ) {
      const decMeta = unifyMetadata(decAnyMetadata(metadata));
      const extra: Array<Uint8Array> = [];
      const additionalSigned: Array<Uint8Array> = [];
      decMeta.extrinsic.signedExtensions.map(({ identifier }) => {
        const signedExtension = signedExtensions[identifier];
        if (!signedExtension)
          throw new Error(`Missing ${identifier} signed extension`);
        extra.push(signedExtension.value);
        additionalSigned.push(signedExtension.additionalSigned);
      });
      const extensions = mergeUint8([...extra, ...additionalSigned]);

      const qrPayload = createQrTransaction(
        VaultQrEncryption.Sr25519,
        publicKey,
        callData,
        extensions,
        Binary.fromHex(genesis).asBytes()
      );
      setTx(qrPayload);

      const signature = await firstValueFrom(currentScannedSignature$);
      if (!signature) {
        throw new Error("Cancelled");
      }

      const tx = createV4Tx(
        decMeta,
        publicKey,
        // Remove encryption code, we already know it
        signature.slice(1),
        extra,
        callData,
        "Sr25519"
      );

      return tx;
    },
  };
};

export const binaryToString = (value: Uint8Array) =>
  Array.from(value, (b) => String.fromCharCode(b)).join("");
export const stringToBinary = (value: string) =>
  Uint8Array.from(value, (c) => c.charCodeAt(0) & 0xff);

export const createFrames = (payload: Uint8Array): Uint8Array[] => {
  const frames = [];
  const frameSize = 1024;

  let idx = 0;
  while (idx < payload.length) {
    frames.push(payload.subarray(idx, idx + frameSize));
    idx += frameSize;
  }

  return frames.map(
    (f, i): Uint8Array =>
      mergeUint8([
        new Uint8Array([0x00]),
        Binary.fromHex(frames.length.toString(16).padStart(4, "0")).asBytes(),
        Binary.fromHex(i.toString(16).padStart(4, "0")).asBytes(),
        f,
      ])
  );
};
