import { AlertCard } from "@/components/AlertCard";
import { TokenInput } from "@/components/TokenInput";
import { TokenValue } from "@/components/TokenValue";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { accountStatus$ } from "@/state/account";
import { tokenProps$ } from "@/state/chain";
import type { TokenProperties } from "@polkadot-api/react-components";
import type { AccountStatus } from "@polkadot-api/sdk-staking";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { type FC } from "react";
import { combineLatest, concat, filter, map, merge, take } from "rxjs";
import { minBond$ } from "./MinBondingAmounts";

const [bondChange$, setBond] = createSignal<bigint | null>();

const getStakingEffectiveFrozen = (
  accountStatus: AccountStatus,
  token: TokenProperties
) => {
  const nonStakingReserves =
    accountStatus.balance.raw.reserved - accountStatus.nomination.totalLocked;

  const rounding = 10n ** BigInt(token.decimals - 2);

  return (
    rounding *
    ((accountStatus.balance.raw.frozen - nonStakingReserves) / rounding + 1n)
  );
};

export const bond$ = state(
  concat(
    combineLatest([accountStatus$, tokenProps$.pipe(filter((v) => v !== null))])
      .pipe(
        map(([account, token]) => {
          if (!account) return 0n;
          if (account.nomination.currentBond > 0)
            return account.nomination.currentBond;

          // Default to frozen balance that's overlapping with the free balance
          const stakingFrozen = getStakingEffectiveFrozen(account, token);
          const minBond = account.nomination.minNominationBond;
          return stakingFrozen < minBond ? minBond : stakingFrozen;
        })
      )
      .pipe(take(1)),
    bondChange$
  )
);

export const BondInput: FC = () => {
  const bond = useStateObservable(bond$);
  const accountStatus = useStateObservable(accountStatus$);
  const token = useStateObservable(tokenProps$);
  const minBond = useStateObservable(minBond$);

  if (!accountStatus || !token) return null;
  const { decimals, symbol } = token;
  const { nomination: nominationStatus } = accountStatus;

  const tokenUnit = 10n ** BigInt(decimals);
  const maxBond = nominationStatus.maxBond;
  const maxSafeBond = maxBond - tokenUnit;

  const showSafeMaxWarning = bond != null && bond > maxSafeBond;

  const stakingEffectiveFrozen = getStakingEffectiveFrozen(
    accountStatus,
    token
  );

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Manage bond</p>
          <p className="text-xs text-muted-foreground">
            Set the amount to stake
          </p>
        </div>
        {bond != null ? (
          <TokenValue className="text-base font-semibold" value={bond} />
        ) : (
          "-"
        )}
      </div>
      <Slider
        value={[Number(bond)]}
        min={Number(minBond)}
        max={Number(maxBond)}
        step={10 ** (token.decimals - 2)}
        onValueChange={([value]) => setBond(BigInt(Math.round(value)))}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-auto">
          <label
            className="mb-1 block text-xs font-medium text-muted-foreground"
            htmlFor="bond-amount-input"
          >
            Amount ({symbol})
          </label>
          <div className="flex items-center gap-2">
            <TokenInput
              id="bond-amount-input"
              inputMode="decimal"
              className="w-full sm:w-52"
              value={bond}
              onChange={(v) =>
                setBond(
                  v == null ? null : v < 0 ? 0n : v > maxBond ? maxBond : v
                )
              }
            />
            {stakingEffectiveFrozen >= minBond ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setBond(stakingEffectiveFrozen);
                }}
              >
                Eq to frozen
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {showSafeMaxWarning ? (
        <AlertCard type="warning">
          Careful! If you bond all your balance you might not have enough to pay
          transaction fees, which could lock you out.
        </AlertCard>
      ) : null}
    </div>
  );
};

export const bondInputSub$ = merge(bond$, accountStatus$, minBond$);
