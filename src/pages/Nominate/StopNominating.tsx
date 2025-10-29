import { TokenValue } from "@/components/TokenValue";
import { TransactionButton } from "@/components/Transactions";
import { selectedAccountAddr$ } from "@/state/account";
import { stakingApi$, stakingSdk$ } from "@/state/chain";
import { activeEraNumber$, unbondDurationInDays$ } from "@/state/era";
import { getNominatorRewards } from "@/state/nominatorInfo";
import type { NominatorRewardsResult } from "@/state/rewards.worker";
import { formatPercentage } from "@/util/format";
import type { Dot } from "@polkadot-api/descriptors";
import { useStateObservable, withDefault } from "@react-rxjs/core";
import { CompatibilityLevel, type TypedApi } from "polkadot-api";
import type { FC } from "react";
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  switchMap,
  takeWhile,
} from "rxjs";

const fastUnstakeApi$ = stakingApi$.pipeState(
  switchMap(async (api) => {
    const fastUnstakeApi = api as TypedApi<Dot>;
    return [
      fastUnstakeApi,
      await fastUnstakeApi.tx.FastUnstake.register_fast_unstake.isCompatible(
        CompatibilityLevel.BackwardsCompatible
      ),
    ] as const;
  }),
  map(([api, isCompatible]) => (isCompatible ? api : null)),
  withDefault(null)
);

export const StopNominating: FC<{ close: () => void }> = ({ close }) => {
  const stopNominating = async () => {
    const [nominator, sdk] = await firstValueFrom(
      combineLatest([selectedAccountAddr$, stakingSdk$])
    );
    if (!nominator) return null;

    return sdk.stopNomination(nominator);
  };
  const fastUnstakeAvailable = !!useStateObservable(fastUnstakeApi$);

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
      {fastUnstakeAvailable && <FastUnstake />}
    </div>
  );
};

const hasExposure = (result: NominatorRewardsResult | null) =>
  !!result && Object.keys(result.byValidator).length > 0;
const fastElegibility$ = stakingApi$.pipeState(
  switchMap((api) =>
    combineLatest([
      selectedAccountAddr$.pipe(filter((v) => v !== null)),
      api.constants.Staking.BondingDuration(),
      activeEraNumber$,
    ])
  ),
  switchMap(([addr, bondDuration, activeEra]) => {
    const relevantEras = new Array(bondDuration)
      .fill(0)
      // ascending order. If bondDuration=1, we would like [activeEra], then
      // [activeEra - (bondDuration(1) - 1) + i(0)]
      .map((_, i) => activeEra - (bondDuration - 1) + i);

    return getNominatorRewards(addr, relevantEras).pipe(
      takeWhile((rewards) => !hasExposure(rewards.result), true),
      map((rewards, i) => ({
        isEligible: hasExposure(rewards.result)
          ? false
          : i + 1 === bondDuration
            ? true
            : null,
        pctComplete: (i + 1) / bondDuration,
        era: rewards.era,
      }))
    );
  }),
  withDefault({
    isEligible: null,
    pctComplete: 0,
    era: 0,
  })
);

const fastDeposit$ = fastUnstakeApi$.pipeState(
  switchMap((api) => (api ? api.constants.FastUnstake.Deposit() : [null])),
  withDefault(null)
);

const estimatedUnlockBlocks$ = fastUnstakeApi$.pipeState(
  filter((v) => v != null),
  switchMap((api) =>
    combineLatest([
      api.query.FastUnstake.ErasToCheckPerBlock.getValue(),
      api.constants.Staking.BondingDuration(),
      api.query.FastUnstake.CounterForQueue.getValue(),
      api.query.FastUnstake.Head.getValue(),
    ])
  ),
  map(([erasPerBlock, erasPerAddr, queueSize, head]) => {
    const totalErasToCheck =
      erasPerAddr * (queueSize + 1) +
      (head ? erasPerAddr - head.checked.length : 0);
    return Math.ceil(totalErasToCheck / erasPerBlock);
  }),
  withDefault(null)
);

const FastUnstake = () => {
  const fastUnstakeApi = useStateObservable(fastUnstakeApi$)!;
  const eligibility = useStateObservable(fastElegibility$);
  const fastDeposit = useStateObservable(fastDeposit$);
  const estimatedBlocks = useStateObservable(estimatedUnlockBlocks$);

  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        In case you haven't been actively nominating for the past unbonding
        period eras, you might be eligible for Fast Unstaking. In that case,
        paying a deposit of{" "}
        {fastDeposit ? <TokenValue value={fastDeposit} /> : "…"}, you can get in
        a fast queue that will unlock your tokens earlier (estimated{" "}
        {estimatedBlocks ?? "…"} blocks).
      </p>
      {eligibility.isEligible ? (
        <TransactionButton
          createTx={() => fastUnstakeApi.tx.FastUnstake.register_fast_unstake()}
        >
          Fast Unstake
        </TransactionButton>
      ) : eligibility.isEligible === false ? (
        <p>
          It looks like you were an active nominator in era {eligibility.era},
          so your account is not eligible for fast unstake.
        </p>
      ) : (
        <p>
          Checking for eligibility… {formatPercentage(eligibility.pctComplete)}
        </p>
      )}
    </div>
  );
};
