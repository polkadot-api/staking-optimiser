import { TrendingUp } from "lucide-react"
import { TokenValue } from "./TokenValue"
import { formatPercentage } from "@/util/format"
import type { FC } from "react"

export const LastEraReward: FC<{ total: bigint; apy: number }> = ({
  total,
  apy,
}) => (
  <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border/50">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <TrendingUp className="h-4 w-4" />
      <span>Last era reward</span>
    </div>
    <div className="space-y-1">
      <p className="text-2xl font-bold text-foreground">
        <TokenValue value={total} />
      </p>
      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        {formatPercentage(apy)} APY
      </p>
    </div>
  </div>
)
