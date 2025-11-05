import { AlertCard } from "@/components/AlertCard"
import { TokenInput } from "@/components/TokenInput"
import { TokenValue } from "@/components/TokenValue"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { accountStatus$ } from "@/state/account"
import { tokenProps$ } from "@/state/chain"
import type { TokenProperties } from "@polkadot-api/react-components"
import type { AccountStatus } from "@polkadot-api/sdk-staking"
import { state, useStateObservable } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import { type FC } from "react"
import { combineLatest, concat, filter, map, merge, take } from "rxjs"
import { minBond$ } from "../MinBondingAmounts"

const [bondChange$, setBond] = createSignal<bigint | null>()

const getStakingEffectiveFrozen = (
  accountStatus: AccountStatus,
  token: TokenProperties,
) => {
  const nonStakingReserves =
    accountStatus.balance.raw.reserved - accountStatus.nomination.totalLocked

  const rounding = 10n ** BigInt(token.decimals - 2)

  const stakingFrozen =
    rounding *
    ((accountStatus.balance.raw.frozen -
      nonStakingReserves -
      accountStatus.balance.raw.existentialDeposit) /
      rounding +
      1n)
  return { stakingFrozen, nonStakingReserves }
}

export const bond$ = state(
  concat(
    combineLatest([accountStatus$, tokenProps$.pipe(filter((v) => v !== null))])
      .pipe(
        map(([account, token]) => {
          if (!account) return 0n
          if (account.nomination.currentBond > 0)
            return account.nomination.currentBond

          // Default to frozen balance that's overlapping with the free balance
          const { stakingFrozen } = getStakingEffectiveFrozen(account, token)
          const minBond = account.nomination.minNominationBond
          return stakingFrozen < minBond ? minBond : stakingFrozen
        }),
      )
      .pipe(take(1)),
    bondChange$,
  ),
)

export const BondInput: FC = () => {
  const bond = useStateObservable(bond$)
  const accountStatus = useStateObservable(accountStatus$)
  const token = useStateObservable(tokenProps$)
  const minBond = useStateObservable(minBond$)

  if (!accountStatus || !token) return null
  const { decimals, symbol } = token
  const { nomination: nominationStatus } = accountStatus

  const tokenUnit = 10n ** BigInt(decimals)
  const maxBond = nominationStatus.maxBond
  const maxSafeBond = maxBond - tokenUnit

  const showSafeMaxWarning = bond != null && bond > maxSafeBond

  const { stakingFrozen, nonStakingReserves } = getStakingEffectiveFrozen(
    accountStatus,
    token,
  )

  const { frozen, existentialDeposit } = accountStatus.balance.raw
  const reservedAfter = bond ? nonStakingReserves + bond : null
  const lockedAfter = reservedAfter
    ? reservedAfter + existentialDeposit > frozen
      ? reservedAfter + existentialDeposit
      : frozen
    : null
  const spendableAfter =
    lockedAfter && bond
      ? bond > accountStatus.nomination.currentBond
        ? accountStatus.balance.total - lockedAfter
        : accountStatus.balance.spendable
      : null
  const frozenRangePct = Math.round(
    (100 * Number(stakingFrozen - minBond)) / Number(maxBond - minBond),
  )

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Manage bond</p>
          <p className="text-xs text-muted-foreground">
            Set the amount to stake
          </p>
        </div>
        <TokenInput
          id="bond-amount-input"
          inputMode="decimal"
          className="w-32"
          value={bond}
          symbol={symbol}
          onChange={(v) =>
            setBond(v == null ? null : v < 0 ? 0n : v > maxBond ? maxBond : v)
          }
        />
      </div>
      <Slider
        value={[Number(bond)]}
        min={Number(minBond)}
        max={Number(maxBond)}
        step={10 ** (token.decimals - 2)}
        onValueChange={([value]) => setBond(BigInt(Math.round(value)))}
        rangeOverlay={
          frozenRangePct > 0 ? (
            <div
              className="absolute bg-chart-4 opacity-50 top-0 bottom-0 left-0"
              style={{
                width: `${frozenRangePct}%`,
              }}
            />
          ) : null
        }
        rangeTicks
      />
      <div className="flex justify-between items-center">
        {stakingFrozen >= minBond ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setBond(stakingFrozen)
            }}
          >
            Eq to frozen
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Spendable after submit:</span>
          <TokenValue
            className="tabular-nums font-semibold"
            value={spendableAfter}
          />
        </div>
      </div>

      {showSafeMaxWarning ? (
        <AlertCard type="warning">
          Careful! If you bond all your balance you might not have enough to pay
          transaction fees, which could lock you out.
        </AlertCard>
      ) : null}
    </>
  )
}

export const bondInputSub$ = merge(bond$, accountStatus$, minBond$)
