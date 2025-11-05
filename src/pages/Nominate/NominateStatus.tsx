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

export const NominateStatus = () => {
  const accountStatus = useStateObservable(accountStatus$)!
  const lastEraReward = useStateObservable(lastReward$)
  const { chain } = useParams()
  const navigate = useNavigate()

  return (
    <div className="grow flex flex-col">
      <div className="mb-1">
        <div className="text-muted-foreground">Currently nominating</div>
        <div>
          Last era reward: <TokenValue value={lastEraReward.total} />{" "}
          <span className="text-muted-foreground">
            ({formatPercentage(lastEraReward.apy)} APY)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div>Reward destination: </div>
          <Payee />
        </div>
      </div>
      {accountStatus.nomination.unlocks.length ? <NominateLocks /> : null}
      <div className="grow" />
      <div className="space-x-2">
        <Button onClick={() => navigate(`/${chain}/nominate/config`)}>
          Manage nomination
        </Button>
        {accountStatus.nomination.currentBond ? (
          <DialogButton
            title="Stop nominating"
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
