import { accountBalance$ } from "@/components/AccountBalance"
import { AlertCard } from "@/components/AlertCard"
import { TokenInput } from "@/components/TokenInput"
import { TokenValue } from "@/components/TokenValue"
import { TransactionButton } from "@/components/Transactions"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { accountStatus$, selectedSignerAccount$ } from "@/state/account"
import {
  stakingApi$,
  stakingSdk$,
  tokenDecimals$,
  tokenProps$,
} from "@/state/chain"
import {
  currentEra$,
  eraDurationInMs$,
  unbondDurationInDays$,
} from "@/state/era"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import {
  MultiAddress,
  NominationPoolsBondExtra,
} from "@polkadot-api/descriptors"
import { state, useStateObservable } from "@react-rxjs/core"
import { useState, type FC } from "react"
import { firstValueFrom, switchMap } from "rxjs"
import { format } from "timeago.js"

const minBond$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.NominationPools.MinJoinBond.getValue()),
  ),
)

export const ManageBond: FC<{ close?: () => void }> = ({ close }) => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const balance = useStateObservable(accountBalance$)
  const [mode, setMode] = useState<"bond" | "unbond" | "leave">("bond")
  const [bond, setBond] = useState<bigint | null>(0n)
  const [unbond, setUnbond] = useState<bigint | null>(0n)

  if (!balance) return null
  if (!poolStatus) return <div>TODO not in a pool</div>

  return (
    <section className="space-y-5">
      <Stats />
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as any)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bond">Bond Extra</TabsTrigger>
          <TabsTrigger value="unbond" disabled={poolStatus.bond == 0n}>
            Unbond
          </TabsTrigger>
          <TabsTrigger value="leave" disabled={poolStatus.bond == 0n}>
            Leave
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bond">
          <BondInput bond={bond} setBond={setBond} close={close} />
        </TabsContent>
        <TabsContent value="unbond">
          <UnbondInput bond={unbond} setBond={setUnbond} close={close} />
        </TabsContent>
        <TabsContent value="leave">
          <Leave close={close} />
        </TabsContent>
      </Tabs>
      <Result
        bond={
          mode === "leave"
            ? -poolStatus.bond
            : mode === "bond"
              ? (bond ?? 0n)
              : -(unbond ?? 0n)
        }
      />
    </section>
  )
}

const BondInput: FC<{
  bond: bigint | null
  setBond: (bond: bigint | null) => void
  close?: () => void
}> = ({ bond, setBond, close }) => {
  const accountStatus = useStateObservable(accountStatus$)
  const token = useStateObservable(tokenProps$)
  const minBond = useStateObservable(minBond$)

  if (!accountStatus || !token) return null
  const { decimals, symbol } = token
  const { balance, nominationPool: poolStatus } = accountStatus

  const currentUnbonding = poolStatus.unlocks
    .map((v) => v.value)
    .reduce((a, b) => a + b, 0n)

  const maxBond =
    balance.total - balance.raw.existentialDeposit - currentUnbonding
  const tokenUnit = 10n ** BigInt(decimals)
  const maxSafeBond = maxBond - tokenUnit

  const resultingBond = poolStatus.currentBond + (bond ?? 0n)
  const showBelowMinWarning = resultingBond > 0n && resultingBond < minBond
  const showSafeMaxWarning =
    resultingBond > maxSafeBond + poolStatus.pendingRewards
  const isLeaving = !!poolStatus.pool && poolStatus.currentBond === 0n

  const performBond = async () => {
    if (bond == null) return null

    const api = await firstValueFrom(stakingApi$)
    return api.tx.NominationPools.bond_extra({
      extra: NominationPoolsBondExtra.FreeBalance(bond),
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Amount to bond</p>
          <p className="text-xs text-muted-foreground">
            Added immediately to your pool stake.
          </p>
        </div>
        <TokenInput
          id="bond-amount-input"
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
        min={0}
        max={Number(maxBond - poolStatus.currentBond)}
        step={10 ** (token.decimals - 2)}
        onValueChange={([value]) => setBond(BigInt(Math.round(value)))}
      />

      {showBelowMinWarning ? (
        <AlertCard type="error">
          Can't have a bond smaller than{" "}
          <TokenValue value={minBond} colored={false} />. Please increase the
          bond or remove all of it.
        </AlertCard>
      ) : null}
      {isLeaving ? (
        <AlertCard type="error">
          You have are currently leaving the pool. You have to wait until the
          locking period ends before you can bond more tokens.
        </AlertCard>
      ) : null}
      {showSafeMaxWarning ? (
        <AlertCard type="warning">
          Careful! If you bond all your balance you might not have enough to pay
          transaction fees, which could lock you out.
        </AlertCard>
      ) : null}
      <TransactionButton
        className="w-full"
        disabled={resultingBond < minBond || isLeaving}
        createTx={performBond}
        onSuccess={close}
      >
        Add Stake
      </TransactionButton>
    </div>
  )
}

const UnbondInput: FC<{
  bond: bigint | null
  setBond: (bond: bigint | null) => void
  close?: () => void
}> = ({ bond, setBond, close }) => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const accountStatus = useStateObservable(accountStatus$)
  const token = useStateObservable(tokenProps$)
  const minBond = useStateObservable(minBond$)
  const selectedAccount = useStateObservable(selectedSignerAccount$)

  if (!accountStatus || !poolStatus || !token) return null
  const { symbol } = token
  const currentBond = accountStatus.nominationPool.currentBond
  const maxBond = currentBond - minBond

  const unbond = async () => {
    if (!selectedAccount || bond == null) return null

    const sdk = await firstValueFrom(stakingSdk$)

    const resultingBond = currentBond - bond

    // Accounting for BigInt <-> Number error
    // assuming we're not letting the user unbond with an in-between value.
    const unbonding = resultingBond < minBond ? maxBond : bond
    return sdk.unbondNominationPool(selectedAccount.address, unbonding)
  }

  if (maxBond === 0n) {
    return (
      <div className="space-y-2 text-sm rounded-lg border border-border/60 bg-background/90 p-4">
        <h3 className="font-medium">Unbond</h3>
        <p className="text-muted-foreground">
          You can't have a bond smaller than{" "}
          <TokenValue colored={false} value={minBond} />. If you want to unbond
          all of your locked tokens, leave the pool instead
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Amount to unbond</p>
          <p className="text-xs text-muted-foreground">
            Starts the unbonding period (about {unbondDurationInDays$} days).
          </p>
        </div>
        <TokenInput
          id="bond-amount-input"
          className="w-32"
          symbol={symbol}
          value={bond}
          onChange={(v) =>
            setBond(v == null ? null : v < 0 ? 0n : v > maxBond ? maxBond : v)
          }
        />
      </div>
      <Slider
        value={[Number(bond)]}
        min={0}
        max={Number(maxBond)}
        step={10 ** (token.decimals - 2)}
        onValueChange={([value]) => setBond(BigInt(Math.round(value)))}
      />

      <TransactionButton
        className="w-full"
        disabled={!bond}
        createTx={unbond}
        onSuccess={close}
      >
        Unbond
      </TransactionButton>
    </div>
  )
}

const Leave: FC<{ close?: () => void }> = ({ close }) => {
  const accountStatus = useStateObservable(accountStatus$)
  const selectedAccount = useStateObservable(selectedSignerAccount$)

  if (!accountStatus || !selectedAccount) return null

  const leave = async () => {
    const api = await firstValueFrom(stakingApi$)

    return api.tx.NominationPools.unbond({
      member_account: MultiAddress.Id(selectedAccount.address),
      unbonding_points: accountStatus.nominationPool.points,
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="space-y-2">
        <p className="font-medium  text-sm">Leave pool</p>
        <p>
          To leave the pool, you will unbond all of your current stake. Once the
          unlocking period ends (in {unbondDurationInDays$} days), you will
          automatically leave the pool once you unlock your tokens
        </p>
        <AlertCard type="warning">
          You won't be able to bond other tokens until the unlocking period
          ends.
        </AlertCard>
      </div>
      <TransactionButton className="w-full" createTx={leave} onSuccess={close}>
        Leave pool
      </TransactionButton>
    </div>
  )
}

const Stats = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const balance = useStateObservable(accountBalance$)
  const minBond = useStateObservable(minBond$)

  if (!poolStatus || !balance) return null

  const currentUnbonding = poolStatus.unlocks
    .map((v) => v.value)
    .reduce((a, b) => a + b, 0n)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StatTile
        label="Current bond"
        value={poolStatus.bond}
        description="Already staked in this pool"
        highlight
      />
      <StatTile
        label="Spendable balance"
        value={balance.spendable}
        description="Available before you make changes"
      />
      {poolStatus.pendingRewards ? (
        <StatTile
          label="Pending rewards"
          value={poolStatus.pendingRewards}
          description="Will be bonded automatically if you add stake"
        />
      ) : null}
      {currentUnbonding ? (
        <StatTile
          label="Currently unlocking"
          value={currentUnbonding}
          description="Waiting for the unbonding period to finish"
        />
      ) : null}
      <StatTile
        label="Minimum required bond"
        value={minBond}
        description="Drop to zero if you want to leave the pool"
      />
    </div>
  )
}

const StatTile: FC<{
  label: string
  value: bigint
  description?: string
  highlight?: boolean
}> = ({ label, value, description, highlight = false }) => (
  <div
    className={cn(
      "rounded-md border border-border/60 bg-muted/30 p-3 text-sm transition-colors",
      highlight && "border-primary/70 bg-primary/5",
    )}
  >
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <div className="mt-1 text-base font-semibold leading-tight">
      <TokenValue className="text-lg font-semibold" value={value} />
    </div>
    {description ? (
      <p className="mt-1 text-[11px] text-muted-foreground/80">{description}</p>
    ) : null}
  </div>
)

const Result: FC<{ bond: bigint }> = ({ bond }) => {
  const account = useStateObservable(accountStatus$)
  const decimals = useStateObservable(tokenDecimals$)
  const currentEra = useStateObservable(currentEra$)
  const eraDuration = useStateObservable(eraDurationInMs$)

  if (!account || decimals == null || currentEra == null) return null
  const { balance, nominationPool: poolStatus } = account

  const spendableAfter =
    balance.spendable - (bond < 0n ? 0n : bond) + poolStatus.pendingRewards
  const resultingBond = poolStatus.currentBond + bond

  const unlocks =
    bond < 0n
      ? [
          ...poolStatus.unlocks,
          {
            era: currentEra + 28,
            value: -bond,
          },
        ]
      : poolStatus.unlocks
  const totalUnlocks = unlocks.map((v) => v.value).reduce((a, b) => a + b, 0n)
  const unlocksByEra = unlocks.reduce((acc: Record<number, bigint>, v) => {
    acc[v.era] = (acc[v.era] ?? 0n) + v.value
    return acc
  }, {})

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span>Resulting bond</span>
        <TokenValue
          className="tabular-nums font-semibold"
          value={resultingBond}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {bond > 0n
          ? "Additional stake will be bonded immediately."
          : bond < 0n
            ? "The amount will begin the unbonding period."
            : "Move the slider or enter an amount to preview the change."}
      </div>

      <div className="h-px bg-border/60" />

      <div className="flex items-center justify-between">
        <span>Spendable after submit</span>
        <TokenValue
          className="tabular-nums font-semibold"
          value={spendableAfter}
        />
      </div>
      {poolStatus.pendingRewards ? (
        <div className="text-xs text-muted-foreground">
          Includes <TokenValue value={poolStatus.pendingRewards} /> from pending
          rewards.
        </div>
      ) : null}

      <div className="h-px bg-border/60" />

      {unlocks.length === 0 ? null : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Resulting unlocks</span>
            <TokenValue
              className="tabular-nums font-semibold"
              value={totalUnlocks}
            />
          </div>
          <div className="max-h-40 space-y-2 overflow-auto pr-1">
            {Object.entries(unlocksByEra).map(([era, value]) => {
              const unlocking = eraDuration * (Number(era) - currentEra)
              return (
                <div
                  key={era}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-background/80 px-3 py-2 text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">
                      Era {era}
                    </span>
                    <span className="text-muted-foreground">
                      {unlocking === 0
                        ? "Unlocks next era"
                        : `Unlocks ${format(new Date(Date.now() + unlocking))}`}
                    </span>
                  </div>
                  <TokenValue
                    className="tabular-nums font-semibold"
                    value={value}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
