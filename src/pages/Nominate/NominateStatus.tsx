import { AddressIdentity } from "@/components/AddressIdentity"
import { DialogButton } from "@/components/DialogButton"
import { TokenValue } from "@/components/TokenValue"
import { accountStatus$, selectedAccountAddr$ } from "@/state/account"
import { lastReward$ } from "@/state/nominate"
import { formatPercentage } from "@/util/format"
import { useStateObservable } from "@react-rxjs/core"
import type { FC } from "react"
import { merge } from "rxjs"
import { NominateLocks, nominateLocksSub$ } from "./NominateLocks"
import { StopNominating } from "./StopNominating"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@polkahub/ui-components"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Target } from "lucide-react"

export const NominateStatus = () => {
  const accountStatus = useStateObservable(accountStatus$)!
  const lastEraReward = useStateObservable(lastReward$)
  const { chain } = useParams()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6 grow ">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <Badge
          variant="outline"
          className="text-base font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
        >
          Currently nominating
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Last era reward</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              <TokenValue value={lastEraReward.total} />
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {formatPercentage(lastEraReward.apy)} APY
            </p>
          </div>
        </div>

        <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Reward destination</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              <Payee />
            </p>
          </div>
        </div>
      </div>

      {accountStatus.nomination.unlocks.length ? <NominateLocks /> : null}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          className="flex-1"
          onClick={() => navigate(`/${chain}/nominate/config`)}
        >
          Manage nomination
        </Button>
        {accountStatus.nomination.currentBond ? (
          <DialogButton
            title="Stop nominating"
            className="flex-1"
            content={({ close }) => <StopNominating close={close} />}
            needsSigner
          >
            Stop nominating
          </DialogButton>
        ) : null}
      </div>
    </div>
  )
}

const Payee: FC = () => {
  const accountStatus = useStateObservable(accountStatus$)!
  const selectedAddr = useStateObservable(selectedAccountAddr$)!
  const payee = accountStatus.nomination.payee

  if (!payee) return "N/A"

  switch (payee.type) {
    case "Staked":
      return "Compounding"
    case "Stash":
      return "Your account"
    case "Controller":
      return (
        <AddressIdentity
          addr={accountStatus.nomination.controller ?? selectedAddr}
        />
      )
    case "Account":
      return <AddressIdentity addr={payee.value} />
    case "None":
      return "Discarded"
  }
}

export const nominateStatusSub$ = merge(
  lastReward$,
  accountStatus$,
  selectedAccountAddr$,
  nominateLocksSub$,
)
