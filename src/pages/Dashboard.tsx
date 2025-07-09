import { Card } from "@/components/Card";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { significantDigitsDecimals, TokenValue } from "@/components/TokenValue";
import { TOKEN_PROPS } from "@/constants";
import { selectedAccountAddr$ } from "@/state/account";
import { typedApi } from "@/state/chain";
import { createStakingSdk } from "@polkadot-api/sdk-staking";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy, Suspense } from "react";
import {
  combineLatest,
  concat,
  filter,
  from,
  map,
  mergeMap,
  scan,
  startWith,
  switchMap,
  take,
  takeWhile,
  withLatestFrom,
} from "rxjs";

const EraChart = lazy(() => import("./EraChart"));

export const Dashboard = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <div className="space-y-4">
          <ActiveEra />
          <NominateStatus />
          <NominateRewards />
        </div>
      </Subscribe>
    </div>
  );
};

const ActiveEra = () => <Card title="Active Era">{activeEra$}</Card>;

const activeEra$ = state(
  from(typedApi.query.Staking.ActiveEra.getValue()).pipe(
    map((v) => v?.index ?? 0)
  )
);

const NominateStatus = () => {
  const bond = useStateObservable(currentNominatorBond$);

  if (!bond) return <Card title="Not nominating" />;

  return (
    <Card title="Currently Nominating">
      Bond:{" "}
      <TokenValue
        value={bond.active}
        decimalsFn={significantDigitsDecimals(2)}
      />{" "}
      active /{" "}
      <TokenValue
        value={bond.total}
        decimalsFn={significantDigitsDecimals(2)}
      />{" "}
      total
    </Card>
  );
};

const currentNominatorBond$ = state(
  selectedAccountAddr$.pipe(
    switchMap((v) =>
      typedApi.query.Staking.Bonded.watchValue(v).pipe(
        // Avoid watching a value that very rarely will change once set
        takeWhile((v) => v != null, true),
        switchMap((addr) =>
          addr ? typedApi.query.Staking.Ledger.watchValue(addr) : [null]
        )
      )
    ),
    map((v) => v ?? null)
  )
);

const NominateRewards = () => {
  const lastReward = useStateObservable(lastReward$);
  const rewardHistory = useStateObservable(rewardHistory$);
  const activeEra = useStateObservable(activeEra$);

  return (
    <Card title="Nominate Rewards">
      <div>
        Last reward: <TokenValue value={lastReward.total} /> (APY{" "}
        {lastReward.apy.toLocaleString()}%)
      </div>
      <div>
        <div>History</div>
        <Suspense>
          <EraChart data={rewardHistory} activeEra={activeEra} />
        </Suspense>
      </div>
    </Card>
  );
};

const sdk = createStakingSdk(typedApi, {
  maxActiveNominators: 100,
});

const lastReward$ = state(
  combineLatest([selectedAccountAddr$, activeEra$]).pipe(
    switchMap(([addr, era]) => sdk.getNominatorRewards(addr, era - 1)),
    withLatestFrom(
      combineLatest([
        typedApi.constants.Babe.ExpectedBlockTime(),
        typedApi.constants.Babe.EpochDuration(),
        typedApi.constants.Staking.SessionsPerEra(),
      ])
    ),
    map(([rewards, [blockTime, epochDuration, sessionsPerEra]]) => {
      const eraDurationInMs =
        BigInt(sessionsPerEra) * epochDuration * blockTime;
      const erasInAYear =
        (365.25 * 24 * 60 * 60 * 1000) / Number(eraDurationInMs);

      const rewardPct = Number(rewards.total) / Number(rewards.activeBond);
      const apy =
        Math.round((Math.pow(1 + rewardPct, erasInAYear) - 1) * 10000) / 100;

      return {
        total: rewards.total,
        apy,
      };
    })
  )
);

const rewardHistory$ = state(
  combineLatest([
    selectedAccountAddr$,
    typedApi.constants.Staking.HistoryDepth(),
  ]).pipe(
    switchMap(([addr, historyDepth]) =>
      activeEra$.pipe(
        take(1),
        map((era) => ({ era, addr, historyDepth: Math.min(21, historyDepth) }))
      )
    ),
    switchMap(({ addr, era: startEra, historyDepth }) => {
      const eras$ = concat(
        from(
          new Array(historyDepth - 1).fill(0).map((_, i) => startEra - i - 1)
        ),
        activeEra$.pipe(
          filter((newEra) => newEra > startEra),
          map((v) => v - 1)
        )
      );

      return eras$.pipe(
        mergeMap(async (era) => {
          try {
            const rewards = await sdk.getNominatorRewards(addr, era);
            return {
              era,
              rewards: Number(rewards.total) / 10 ** TOKEN_PROPS.decimals,
            };
          } catch (ex) {
            console.error(ex);
            return null;
          }
        }, 5),
        scan((acc, v) => {
          if (!v) return acc;

          const idx = startEra - 1 - v.era;
          const newValue = [...acc];
          newValue[idx] = v;
          if (newValue.length > historyDepth) {
            return newValue.slice(1);
          }
          return newValue;
        }, new Array<{ era: number; rewards: number }>()),
        startWith([]),
        map((v) => v.filter((v) => !!v))
      );
    })
  ),
  []
);
