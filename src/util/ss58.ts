import { sliceMiddleStr } from "@polkadot-api/react-components";
import { getSs58AddressInfo, type SS58String } from "polkadot-api";

export const sliceMiddleAddr = (s: string) => sliceMiddleStr(s, 12);

export const getPublicKey = (addr: SS58String) => {
  const info = getSs58AddressInfo(addr);
  if (!info.isValid) throw new Error("Invalid SS58 Address");
  return info.publicKey;
};
