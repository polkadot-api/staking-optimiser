import { tokenProps$ } from "@/state/chain"
import { useTokenInput } from "@polkadot-api/react-components"
import { useStateObservable } from "@react-rxjs/core"
import { type FC } from "react"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"

export const TokenInput: FC<
  {
    value?: bigint | null
    symbol?: string
    onChange?: (value: bigint | null) => void
  } & Omit<React.ComponentProps<"input">, "value" | "onChange">
> = ({ value, onChange, symbol, ...props }) => {
  const token = useStateObservable(tokenProps$)
  const inputProps = useTokenInput(token, value, onChange)

  const inputElement = (
    <Input
      {...props}
      className={cn(
        symbol ? "pr-10 after:content-[attr(data-foo)]" : "",
        props.className,
      )}
      data-foo={symbol}
      type="text"
      {...inputProps}
    />
  )

  return symbol ? (
    <div className={cn("relative", props.className)}>
      {inputElement}
      <div className="text-sm text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2">
        {symbol}
      </div>
    </div>
  ) : (
    inputElement
  )
}
