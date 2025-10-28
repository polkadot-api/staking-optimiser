import {
  AccountBalance,
  accountBalanceSub$,
} from "@/components/AccountBalance";
import { AddressIdentity } from "@/components/AddressIdentity";
import { Card } from "@/components/Card";
import { CardPlaceholder } from "@/components/CardPlaceholder";
import { DialogButton } from "@/components/DialogButton";
import { TransactionButton } from "@/components/Transactions";
import { PERBILL } from "@/constants";
import { cn } from "@/lib/utils";
import { accountStatus$, selectedAccountAddr$ } from "@/state/account";
import { stakingApi$, stakingSdk$ } from "@/state/chain";
import { activeEraNumber$ } from "@/state/era";
import {
  currentNominatorBond$,
  currentNominatorStatus$,
  rewardHistory$,
  validatorPerformance$,
} from "@/state/nominate";
import { roundToDecimalPlaces } from "@/util/format";
import { state, useStateObservable } from "@react-rxjs/core";
import { type SS58String } from "polkadot-api";
import { lazy, Suspense, type FC } from "react";
import {
  combineLatest,
  defer,
  firstValueFrom,
  ignoreElements,
  map,
  merge,
  switchMap,
} from "rxjs";
import { ManageNomination } from "./ManageNomination";
import { MinBondingAmounts, minBondingAmountsSub$ } from "./MinBondingAmounts";
import { NominateLocks, nominateLocksSub$ } from "./NominateLocks";

const EraChart = lazy(() => import("@/components/EraChart"));

export const NominatingContent = () => (
  <div className="space-y-4">
    <MinBondingAmounts />
    <Suspense fallback={<CardPlaceholder height={350} />}>
      <StatusCard />
    </Suspense>
    <NominateRewards />
    <SelectedValidators />
  </div>
);

export const nominatingContentSub$ = defer(() =>
  merge(
    minBondingAmountsSub$,
    statusCardSub$,
    nominateRewardsSub$,
    selectedValidatorsSub$
  )
);

export const ManageNominationBtn = () => (
  <DialogButton
    title="Manage nomination"
    content={() => <ManageNomination />}
    dialogClassName="md:max-w-3xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl"
    needsSigner
  >
    Manage nomination
  </DialogButton>
);

const StatusCard = () => {
  const currentBond = useStateObservable(currentNominatorBond$);
  const status = useStateObservable(accountStatus$);

  const stopNominating = async () => {
    const [nominator, sdk] = await firstValueFrom(
      combineLatest([selectedAccountAddr$, stakingSdk$])
    );
    if (!nominator) return null;

    return sdk.stopNomination(nominator);
  };

  return (
    <Card title="Status">
      <div className="flex flex-wrap gap-2 items-start">
        <AccountBalance className="grow-2" />
        {currentBond?.unlocks.length ? <NominateLocks /> : null}
      </div>
      <div className="mt-4 space-x-2">
        <ManageNominationBtn />
        {status?.nomination.currentBond ? (
          <TransactionButton createTx={stopNominating}>
            Stop nominating
          </TransactionButton>
        ) : null}
      </div>
    </Card>
  );
};

const statusCardSub$ = merge(
  currentNominatorBond$,
  accountStatus$,
  accountBalanceSub$,
  nominateLocksSub$
);

const selectedValidators$ = state(
  combineLatest([selectedAccountAddr$, stakingApi$]).pipe(
    switchMap(([addr, stakingApi]) =>
      addr ? stakingApi.query.Staking.Nominators.watchValue(addr) : [null]
    ),
    map((v) => v?.targets ?? [])
  )
);

const validatorPrefs$ = state((addr: SS58String) =>
  combineLatest([activeEraNumber$, stakingApi$]).pipe(
    switchMap(([era, stakingApi]) =>
      stakingApi.query.Staking.ErasValidatorPrefs.getValue(era, addr)
    )
  )
);

const SelectedValidators = () => {
  const validators = useStateObservable(selectedValidators$);

  return (
    <Card title="Selected Validators">
      {validators.length ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-2">
          {validators.map((v) => (
            <li key={v}>
              <Suspense fallback={<SelectedValidatorSkeleton validator={v} />}>
                <SelectedValidator validator={v} />
              </Suspense>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted-foreground">No selected validators</div>
      )}
    </Card>
  );
};

const selectedValidatorsSub$ = selectedValidators$.pipe(
  switchMap((v) =>
    merge(
      ...v.map((addr) =>
        merge(validatorPerformance$(addr), validatorPrefs$(addr))
      ),
      activeEraNumber$
    )
  ),
  ignoreElements()
);

const validatorIsCurrentlyActive$ = state(
  (addr: SS58String) =>
    currentNominatorStatus$.pipe(
      map((status) => !!status.find((v) => v.validator === addr))
    ),
  false
);

const SelectedValidator: FC<{
  validator: SS58String;
}> = ({ validator }) => {
  const rewardHistory = useStateObservable(validatorPerformance$(validator));
  const isActive = useStateObservable(validatorIsCurrentlyActive$(validator));
  const prefs = useStateObservable(validatorPrefs$(validator));
  const activeEra = useStateObservable(activeEraNumber$);

  const averageApy = rewardHistory.length
    ? roundToDecimalPlaces(
        rewardHistory
          .map((v) => v.apy)
          .filter((v) => v != null)
          .reduce((a, b) => a + b, 0) / rewardHistory.length,
        2
      )
    : null;

  return (
    <div
      className={cn("bg-secondary rounded p-2", {
        "bg-positive/10 shadow-lg": isActive,
      })}
    >
      <div className="flex items-center justify-between">
        <AddressIdentity addr={validator} />
        {averageApy || prefs.commission ? (
          <div className="text-muted-foreground text-sm">
            {averageApy ? (
              <div>
                Avg APY: <b className="text-foreground">{averageApy}%</b>
              </div>
            ) : null}
            {prefs.commission ? (
              <div>
                Commission:{" "}
                <b className="text-foreground">
                  {roundToDecimalPlaces(
                    100 * Number(prefs.commission / PERBILL),
                    2
                  )}
                  %
                </b>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <EraChart height={200} data={rewardHistory} activeEra={activeEra} />
    </div>
  );
};
const SelectedValidatorSkeleton: FC<{ validator: SS58String }> = ({
  validator,
}) => (
  <div
    className="bg-secondary animate-pulse rounded p-2"
    style={{ height: 255 }}
  >
    <AddressIdentity addr={validator} />
  </div>
);

export const NominateRewards = () => {
  const rewardHistory = useStateObservable(rewardHistory$);
  const activeEra = useStateObservable(activeEraNumber$);

  return (
    <Suspense fallback={<CardPlaceholder />}>
      <Card title="Nominate Rewards">
        <EraChart data={rewardHistory} activeEra={activeEra} />
      </Card>
    </Suspense>
  );
};

export const nominateRewardsSub$ = activeEraNumber$;
