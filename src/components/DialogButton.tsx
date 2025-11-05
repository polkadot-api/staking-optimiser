import { selectedSignerAccount$ } from "@/state/account"
import { codeSplit } from "@/util/codeSplit"
import { Subscribe, useStateObservable, withDefault } from "@react-rxjs/core"
import { Eye } from "lucide-react"
import {
  useState,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from "react"
import { map } from "rxjs"
import { CardPlaceholder } from "./CardPlaceholder"
import { Button } from "./ui/button"

const dialogModule = import("@/components/ui/dialog")

export type DialogButtonProps = PropsWithChildren<{
  title?: string
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null
    | undefined
  className?: string
  content: (args: { isOpen: boolean; close: () => void }) => ReactNode
  needsSigner?: boolean
  disabled?: boolean
  dialogClassName?: string
  contentClassName?: string
}>

const hasSigner$ = selectedSignerAccount$.pipeState(
  map((v) => !!v),
  withDefault(true),
)

const Trigger: FC<
  PropsWithChildren<{
    className?: string
    needsSigner?: boolean
    disabled?: boolean
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link"
      | null
      | undefined
  }>
> = ({ needsSigner, disabled, children, ...props }) => {
  const hasSigner = useStateObservable(hasSigner$)

  return (
    <Button disabled={(needsSigner && !hasSigner) || disabled} {...props}>
      {children}
      {needsSigner && !hasSigner ? <Eye /> : null}
    </Button>
  )
}

export const DialogButton = codeSplit(
  dialogModule,
  ({ children, ...props }: DialogButtonProps) => (
    <Trigger {...props}>{children}</Trigger>
  ),
  ({
    variant,
    className,
    payload,
    disabled,
    needsSigner,
    title,
    children,
    dialogClassName,
    contentClassName,
    content,
  }) => {
    const [open, setOpen] = useState(false)

    const {
      Dialog,
      DialogBody,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogTrigger,
    } = payload

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Trigger
            className={className}
            variant={variant}
            needsSigner={needsSigner}
            disabled={disabled}
          >
            {children}
          </Trigger>
        </DialogTrigger>
        <DialogContent className={dialogClassName}>
          {title ? (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
          ) : (
            <div className="pt-4" />
          )}
          <DialogBody id="dialog-content" className={contentClassName}>
            <Subscribe fallback={<CardPlaceholder />}>
              {content({ isOpen: open, close: () => setOpen(false) })}
            </Subscribe>
          </DialogBody>
        </DialogContent>
      </Dialog>
    )
  },
)
