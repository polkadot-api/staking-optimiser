import { TokenValue } from "@/components/TokenValue";
import { TransactionButton } from "@/components/Transactions";
import { selectedSignerAccount$ } from "@/state/account";
import { stakingApi$ } from "@/state/chain";
import { activeEra$, eraDurationInMs$ } from "@/state/era";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { estimatedFuture } from "@/util/date";
import { MultiAddress } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { combineLatest, filter, firstValueFrom, map } from "rxjs";
import { slashingSpans$ } from "../Nominate/NominateLocks";

const locks$ = state(
  combineLatest([
    activeEra$,
    eraDurationInMs$,
    currentNominationPoolStatus$.pipe(filter((v) => v != null)),
  ]).pipe(
    map(([activeEra, eraDuration, pool]) => {
      const unlocks = pool.unlocks.map(({ era, value }) => ({
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

export const ManageLocks = () => {
  const locks = useStateObservable(locks$);

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
      {locks.some((v) => v.unlocked) ? <UnlockPoolBonds /> : null}
    </div>
  );
};

export const UnlockPoolBonds = () => {
  const selectedAccount = useStateObservable(selectedSignerAccount$);

  return (
    <TransactionButton
      createTx={async () => {
        const [api, slashingSpans] = await Promise.all([
          firstValueFrom(stakingApi$),
          firstValueFrom(slashingSpans$.pipe(filter((v) => v != null))),
        ]);

        return api.tx.NominationPools.withdraw_unbonded({
          member_account: MultiAddress.Id(selectedAccount!.address),
          num_slashing_spans: slashingSpans,
        });
      }}
    >
      Unlock funds
    </TransactionButton>
  );
};
