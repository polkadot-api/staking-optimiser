import { AccountBalance } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { significantDigitsDecimals, TokenValue } from "@/components/TokenValue";
import { stakingApi$ } from "@/state/chain";
import { activeEra$, activeEraNumber$ } from "@/state/era";
import {
  currentNominatorBond$,
  lastReward$,
  rewardHistory$,
} from "@/state/nominate";
import { estimatedFuture } from "@/util/date";
import { formatPercentage } from "@/util/format";
import { Binary } from "@polkadot-api/substrate-bindings";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { mergeUint8 } from "polkadot-api/utils";
import { lazy, Suspense } from "react";
import { switchMap } from "rxjs";

const EraChart = lazy(() => import("@/components/EraChart"));

export const Dashboard = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <div className="space-y-4">
          <ActiveEra />
          <Card title="Balance">
            <AccountBalance />
          </Card>
          <NominatingContent />
        </div>
      </Subscribe>
    </div>
  );
};

const NominatingContent = () => {
  const bond = useStateObservable(currentNominatorBond$);

  if (!bond) return null;

  return (
    <>
      <NominateStatus />
      <NominateRewards />
    </>
  );
};

const ActiveEra = () => {
  const activeEra = useStateObservable(activeEra$);
  return (
    <Card title="Active Era">
      <div>{activeEra.era}</div>
      <div>{formatPercentage(activeEra.pctComplete)}</div>
      <div>Expected end: {estimatedFuture(activeEra.estimatedEnd)}</div>
    </Card>
  );
};

const NominateStatus = () => {
  const bond = useStateObservable(currentNominatorBond$);

  if (!bond) return <Card title="Not nominating" />;

  return (
    <Card title="Currently Nominating">
      Bond:{" "}
      <TokenValue value={bond.bond} decimalsFn={significantDigitsDecimals(2)} />
    </Card>
  );
};

const NominateRewards = () => {
  const lastReward = useStateObservable(lastReward$);
  const rewardHistory = useStateObservable(rewardHistory$);
  const activeEra = useStateObservable(activeEraNumber$);

  return (
    <Card title="Nominate Rewards">
      <div>
        Last reward: <TokenValue value={lastReward.total} /> (APY{" "}
        {lastReward.apy.toLocaleString()}%)
      </div>
      <div>
        Commission: <TokenValue value={lastReward.totalCommission} />
      </div>
      <div>
        <div>History</div>
        <Suspense>
          <EraChart data={rewardHistory} activeEra={activeEra} />
        </Suspense>
      </div>
    </Card>
  );
};

import encodeQr from "qr";

const createFrames = (input: Uint8Array): Uint8Array[] => {
  const frames = [];
  const frameSize = 1024;

  let idx = 0;
  while (idx < input.length) {
    frames.push(input.subarray(idx, idx + frameSize));
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

const binaryToString = (value: Uint8Array) =>
  // new TextDecoder("latin1").decode(value);
  Array.from(value, (b) => String.fromCharCode(b)).join("");
const stringToBinary = (value: string) =>
  Uint8Array.from(value, (c) => c.charCodeAt(0) & 0xff);

// stakingApi$
//   .pipe(
//     switchMap((v) =>
//       v.tx.Staking.bond_extra({
//         max_additional: 123487n,
//       }).sign(
//         createPolkadotVaultSigner(
//           "164u1N245i9fu52fJvkemo3YY86htFYUCb2MujAszDAdNZMs"
//         )
//       )
//     )
//   )
//   .subscribe((r) => {
//     const payload = Binary.fromHex(r);
//     const frame0 = Binary.fromBytes(createFrames(payload.asBytes())[0]);
//     console.log(
//       payload.asHex(),
//       Binary.fromBytes(
//         stringToBinary(binaryToString(payload.asBytes()))
//       ).asHex()
//     );
//     return console.log(
//       encodeQr(binaryToString(frame0.asBytes()), "ascii", {
//         encoding: "byte",
//         textEncoder: stringToBinary,
//       })
//     );
//   });

// import { frameLoop, frontalCamera, QRCanvas } from "qr/dom.js";

// const canvas = new QRCanvas(
//   {},
//   {
//     textDecoder: binaryToString,
//   }
// );

// let element: HTMLVideoElement;
// if (document.getElementById("my-video")) {
//   element = document.getElementById("my-video")! as HTMLVideoElement;
// } else {
//   element = document.createElement("video");
//   element.id = "my-video";
//   element.style = "position: absolute; top: 0;";
//   document.body.appendChild(element);
// }
// const camera = await frontalCamera(element);
// const devices = await camera.listDevices();
// camera.setDevice(devices[0].deviceId);

// const stop = frameLoop(() => {
//   const res = camera.readFrame(canvas);
//   if (res) {
//     console.log(Binary.fromBytes(stringToBinary(res)).asHex());
//     camera.stop();
//     stop();
//     document.body.removeChild(element);
//   }
// });
