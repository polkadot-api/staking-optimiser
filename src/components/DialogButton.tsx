import { codeSplit } from "@/util/codeSplit";
import { Subscribe, useStateObservable, withDefault } from "@react-rxjs/core";
import {
  useState,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { Button } from "./ui/button";
import { selectedSignerAccount$ } from "@/state/account";
import { map } from "rxjs";
import { Eye } from "lucide-react";

const dialogModule = import("@/components/ui/dialog");

export type DialogButtonProps = PropsWithChildren<{
  title?: string;
  content: (args: { isOpen: boolean; close: () => void }) => ReactNode;
  needsSigner?: boolean;
  disabled?: boolean;
}>;

const hasSigner$ = selectedSignerAccount$.pipeState(
  map((v) => !!v),
  withDefault(true)
);

const Trigger: FC<
  PropsWithChildren<{ needsSigner?: boolean; disabled?: boolean }>
> = ({ needsSigner, disabled, children, ...props }) => {
  const hasSigner = useStateObservable(hasSigner$);

  return (
    <Button disabled={(needsSigner && !hasSigner) || disabled} {...props}>
      {children}
      {needsSigner && !hasSigner ? <Eye /> : null}
    </Button>
  );
};

export const DialogButton = codeSplit(
  dialogModule,
  ({ children, needsSigner, disabled }: DialogButtonProps) => (
    <Trigger needsSigner={needsSigner} disabled={disabled}>
      {children}
    </Trigger>
  ),
  ({ payload, disabled, needsSigner, title, children, content }) => {
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
          <Trigger needsSigner={needsSigner} disabled={disabled}>
            {children}
          </Trigger>
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
