import { estimatedFuture } from "@/util/date"
import { Clock } from "lucide-react"
import type { FC } from "react"
import { TokenValue } from "./TokenValue"
import type { Transaction } from "polkadot-api"
import type { AsyncTransaction } from "@polkadot-api/sdk-staking"
import { TransactionButton } from "./Transactions"

type Awaitable<T> = T | Promise<T>

export const Locks: FC<{
  locks: Array<{
    value: bigint
    unlocked: boolean
    estimatedUnlock: Date
  }>
  createTx: () => Awaitable<
    Transaction<any, any, any, any> | AsyncTransaction | null
  >
}> = ({ locks, createTx }) => {
  const expired = locks.filter((x) => x.unlocked)
  const active = locks.filter((x) => !x.unlocked)

  return (
    <>
      {active.length > 0 && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-0.5">
              Active Unlocks
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {active.map(({ estimatedUnlock, value }, index) => (
                <p
                  key={index}
                  className="text-sm text-amber-900 dark:text-amber-200"
                >
                  <span className="text-muted-foreground">
                    {estimatedFuture(estimatedUnlock)}:
                  </span>{" "}
                  <span className="font-semibold">
                    {<TokenValue value={value} />}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
      {expired.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Expired Unlocks
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {expired.map(({ value }, index) => (
                <p
                  key={index}
                  className="text-sm text-blue-900 dark:text-blue-200"
                >
                  <span className="text-muted-foreground">Unbonded:</span>{" "}
                  <span className="font-semibold">
                    {<TokenValue value={value} />}
                  </span>
                </p>
              ))}
            </div>
          </div>
          <TransactionButton
            createTx={createTx}
            size="sm"
            variant="outline"
            className="flex-shrink-0 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 dark:bg-blue-600 dark:border-blue-600 dark:hover:bg-blue-700"
          >
            Unlock funds
          </TransactionButton>
        </div>
      )}
    </>
  )
}
