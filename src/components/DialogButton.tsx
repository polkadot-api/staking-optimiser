import { codeSplit } from "@/util/codeSplit";
import { Subscribe } from "@react-rxjs/core";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "./ui/button";

const dialogModule = import("@/components/ui/dialog");

export type DialogButtonProps = PropsWithChildren<{
  title?: string;
  content: (args: { isOpen: boolean; close: () => void }) => ReactNode;
}>;

export const DialogButton = codeSplit(
  dialogModule,
  ({ children }: DialogButtonProps) => <Button>{children}</Button>,
  ({ payload, title, children, content }) => {
    const [open, setOpen] = useState(false);

    const {
      Dialog,
      DialogBody,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogTrigger,
    } = payload;

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>{children}</Button>
        </DialogTrigger>
        <DialogContent>
          {title ? (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
          ) : (
            <div className="pt-4" />
          )}
          <DialogBody>
            <Subscribe fallback={null}>
              {content({ isOpen: open, close: () => setOpen(false) })}
            </Subscribe>
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }
);
