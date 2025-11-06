import { cn } from "@/lib/utils"
import { CoinsIcon, WalletIcon } from "lucide-react"
import { openSelectAccount } from "polkahub"
import type { FC, ReactNode } from "react"
import { TokenValue } from "./TokenValue"
import { Button } from "./ui/button"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-border/50 bg-muted/20",
        className,
      )}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {typeof description === "string" ? (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      ) : (
        description
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        {action}
        {secondaryAction}
      </div>
    </div>
  )
}

export const NoAccountSelected: FC<{
  to: string
}> = ({ to }) => (
  <EmptyState
    icon={<WalletIcon />}
    title="No account selected"
    description={`Select an account to see your staking options and ${to}.`}
    action={
      <Button type="button" onClick={openSelectAccount}>
        Select account
      </Button>
    }
  />
)

export const NotEnoughFunds: FC<{
  minValue: bigint
  to: string
  action?: ReactNode
}> = ({ minValue, to, action }) => (
  <EmptyState
    icon={<CoinsIcon />}
    title="Not enough funds"
    description={
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        You need at least <TokenValue value={minValue} colored={false} /> to{" "}
        {to}.
      </p>
    }
    action={action}
  />
)
