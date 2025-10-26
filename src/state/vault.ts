import { Binary } from "polkadot-api";
import { mergeUint8 } from "polkadot-api/utils";
import { createPolkadotVaultProvider } from "polkahub";

export const polkadotVaultProvider = createPolkadotVaultProvider();

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
