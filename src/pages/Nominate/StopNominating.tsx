import { TransactionButton } from "@/components/Transactions"
import { selectedAccountAddr$ } from "@/state/account"
import { stakingSdk$ } from "@/state/chain"
import { unbondDurationInDays$ } from "@/state/era"
import type { FC } from "react"
import { combineLatest, firstValueFrom } from "rxjs"

export const StopNominating: FC<{ close: () => void }> = ({ close }) => {
  const stopNominating = async () => {
    const [nominator, sdk] = await firstValueFrom(
      combineLatest([selectedAccountAddr$, stakingSdk$]),
    )
    if (!nominator) return null

    return sdk.stopNomination(nominator)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          To unlock your tokens, you can stop nominating. You will stop
          receiving rewards after the current active era ends, and your tokens
          will be unlocked after the unbonding period ({unbondDurationInDays$}{" "}
          days)
        </p>
        <TransactionButton createTx={stopNominating} onSuccess={close}>
          Stop Nominating
        </TransactionButton>
      </div>
    </div>
  )
}
