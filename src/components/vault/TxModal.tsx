import {
  activeTx$,
  binaryToString,
  cancelTx,
  createFrames,
  setSignature,
  stringToBinary,
} from "@/state/vault";
import { codeSplit } from "@/util/codeSplit";
import { useStateObservable } from "@react-rxjs/core";
import encodeQr from "qr";
import { useCallback, useEffect, useState, type FC } from "react";
import { Button } from "../ui/button";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { QrCamera } from "./QrCamera";
import { Binary } from "polkadot-api";

const dialogModule = import("@/components/ui/dialog");

export const VaultTxModal = codeSplit(
  dialogModule,
  () => null,
  ({ payload }) => {
    const activeTx = useStateObservable(activeTx$);
    const { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } =
      payload;

    return (
      <Dialog open={!!activeTx} onOpenChange={cancelTx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vault Transaction</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VaultTxContent activeTx={activeTx} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }
);

const VaultTxContent: FC<{
  activeTx: Uint8Array<ArrayBufferLike> | null;
}> = ({ activeTx }) => {
  const [mode, setMode] = useState<"tx" | "sig">("tx");

  const onRead = useCallback(
    (res: string) => setSignature(Binary.fromHex(res).asBytes()),
    []
  );

  if (mode === "tx") {
    return (
      <div className="flex flex-col items-center gap-2">
        <VaultTx tx={activeTx} />
        <Button type="button" variant="outline" onClick={() => setMode("sig")}>
          <Camera />
          Scan Signature
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <QrCamera onRead={onRead} />
      <Button type="button" variant="outline" onClick={() => setMode("tx")}>
        <ChevronLeft />
        Back
      </Button>
    </div>
  );
};

const VaultTx: FC<{
  tx: Uint8Array<ArrayBufferLike> | null;
}> = ({ tx }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!tx) return;

    const frames = createFrames(tx);
    const drawFrame = (frame: Uint8Array) => {
      const encoded = encodeQr(binaryToString(frame), "gif", {
        encoding: "byte",
        textEncoder: stringToBinary,
        scale: 4,
      });

      setImgSrc(`data:image/gif;base64,${encoded.toBase64()}`);
    };
    drawFrame(frames[0]);

    if (frames.length === 1) return;

    let i = 1;
    const token = setInterval(() => {
      drawFrame(frames[i]);
      i = (i + 1) % frames.length;
    }, 300);
    return () => clearInterval(token);
  }, [tx]);

  return (
    <div className="text-center">
      <p>Scan the transaction with your device</p>
      <img src={imgSrc ?? undefined} className="m-auto" />
    </div>
  );
};
