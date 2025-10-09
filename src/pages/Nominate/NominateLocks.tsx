import { TokenValue } from "@/components/TokenValue";
import { TransactionButton } from "@/components/Transactions";
import { selectedSignerAccount$ } from "@/state/account";
import { relayApi$, stakingApi$ } from "@/state/chain";
import { activeEra$, eraDurationInMs$ } from "@/state/era";
import { currentNominatorBond$ } from "@/state/nominate";
import { estimatedFuture } from "@/util/date";
import { state, useStateObservable } from "@react-rxjs/core";
import { combineLatest, filter, firstValueFrom, map, switchMap } from "rxjs";

const locks$ = state(
  combineLatest([
    activeEra$,
    eraDurationInMs$,
    currentNominatorBond$.pipe(filter((v) => v != null)),
  ]).pipe(
    map(([activeEra, eraDuration, bond]) => {
      const unlocks = bond.unlocks.map(({ era, value }) => ({
        value,
        unlocked: era <= activeEra.era,
        estimatedUnlock: new Date(
          Date.now() +
            Math.max(0, activeEra.estimatedEnd.getTime() - Date.now()) +
            (era - activeEra.era - 1) * eraDuration
        ),
      }));
      return unlocks.sort(
        (a, b) => a.estimatedUnlock.getTime() - b.estimatedUnlock.getTime()
      );
    })
  )
);

export const NominateLocks = () => {
  const locks = useStateObservable(locks$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);

  return (
    <div className="grow">
      <h3 className="font-medium text-muted-foreground">Active Unlocks</h3>
      <ol>
        {locks.map(({ unlocked, estimatedUnlock, value }, i) => (
          <li key={i}>
            <span className="text-muted-foreground">
              {unlocked ? "Unbonded" : estimatedFuture(estimatedUnlock)}:
            </span>{" "}
            <TokenValue value={value} />{" "}
          </li>
        ))}
      </ol>
      {locks.some((v) => v.unlocked) ? (
        <TransactionButton
          signer={selectedAccount?.polkadotSigner}
          createTx={async () => {
            const [api, slashingSpans] = await Promise.all([
              firstValueFrom(stakingApi$),
              firstValueFrom(slashingSpans$.pipe(filter((v) => v != null))),
            ]);

            return api.tx.Staking.withdraw_unbonded({
              num_slashing_spans: slashingSpans,
            });
          }}
        >
          Unlock funds
        </TransactionButton>
      ) : null}
    </div>
  );
};

export const slashingSpans$ = state(
  // TODO verify it's actually on relay chain
  combineLatest([
    relayApi$,
    selectedSignerAccount$.pipe(filter((v) => v != null)),
  ]).pipe(
    switchMap(([api, account]) =>
      api.query.Staking.SlashingSpans.getValue(account?.address)
    ),
    map((r) => (r ? 1 + r.prior.length : 0))
  ),
  null
);
