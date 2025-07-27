import { DialogButton } from "@/components/DialogButton";
import { TokenValue } from "@/components/TokenValue";
import { Button } from "@/components/ui/button";
import { selectedSignerAccount$ } from "@/state/account";
import { balancesApi$, stakingApi$ } from "@/state/chain";
import { activeEra$, eraDurationInMs$ } from "@/state/era";
import { currentNominatorBond$ } from "@/state/nominate";
import { estimatedFuture } from "@/util/date";
import { state, useStateObservable } from "@react-rxjs/core";
import { useState } from "react";
import { combineLatest, filter, firstValueFrom, map, switchMap } from "rxjs";

const locks$ = state(
  combineLatest([
    activeEra$,
    eraDurationInMs$,
    currentNominatorBond$.pipe(filter((v) => v != null)),
  ]).pipe(
    map(([activeEra, eraDuration, bond]) => {
      const unlocks = bond.unlocking.map(({ era, value }) => ({
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
        <DialogButton title="Unlock" content={() => <Unlock />} needsSigner>
          Unlock funds
        </DialogButton>
      ) : null}
    </div>
  );
};

const slashingSpans$ = state(
  // TODO verify it's actually on relay chain
  combineLatest([
    balancesApi$,
    selectedSignerAccount$.pipe(filter((v) => v != null)),
  ]).pipe(
    switchMap(([api, account]) =>
      api.query.Staking.SlashingSpans.getValue(account?.address)
    ),
    map((r) => (r ? 1 + r.prior.length : 0))
  ),
  null
);
const Unlock = () => {
  //   const pool = useStateObservable(currentNominationPoolStatus$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);
  const locks = useStateObservable(locks$);
  const unlockableLocks = locks.filter((l) => l.unlocked);

  const totalUnlockedValue = unlockableLocks
    .map((l) => l.value)
    .reduce((a, b) => a + b, 0n);

  // Preload slashingSpans as we'll need these when signing
  useStateObservable(slashingSpans$);
  const [submitting, setSubmitting] = useState(false);

  const unlock = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const [api, slashingSpans] = await Promise.all([
        firstValueFrom(stakingApi$),
        firstValueFrom(slashingSpans$.pipe(filter((v) => v != null))),
      ]);

      return api.tx.Staking.withdraw_unbonded({
        num_slashing_spans: slashingSpans,
      })
        .signSubmitAndWatch(selectedAccount.polkadotSigner)
        .subscribe(
          (v) => console.log(v),
          (err) => console.error(err)
        );
    } catch (ex) {
      console.error(ex);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        A total of <TokenValue value={totalUnlockedValue} /> can be unlocked.
      </div>
      <div>
        <Button onClick={unlock}>Unlock</Button>
      </div>
    </div>
  );
};
