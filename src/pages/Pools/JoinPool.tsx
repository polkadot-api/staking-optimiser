import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { TokenValue } from "@/components/TokenValue";
import { Button } from "@/components/ui/button";
import { accountStatus$, selectedSignerAccount$ } from "@/state/account";
import { stakingApi$, stakingSdk$ } from "@/state/chain";
import { state, useStateObservable } from "@react-rxjs/core";
import type { FC } from "react";
import { switchMap } from "rxjs";

const minJoin$ = stakingApi$.pipeState(
  switchMap((api) => api.query.NominationPools.MinJoinBond.getValue())
);

export const JoinPool: FC<{ poolId: number }> = ({ poolId }) => {
  const accountStatus = useStateObservable(accountStatus$);
  const signer = useStateObservable(selectedSignerAccount$);
  const minBond = useStateObservable(minJoin$);

  const cantJoinReason =
    !accountStatus || !signer
      ? "Select an account to join"
      : accountStatus.nomination.maxBond < minBond
        ? "Not enough funds to join"
        : null;

  return (
    <Card
      title="Join this pool"
      className="space-y-4 border-primary/40 bg-primary/5"
    >
      <p className="text-sm text-muted-foreground">
        You can join a nomination pool with a minimum bond of{" "}
        <TokenValue value={minBond} colored={false} /> and start earning rewards
        with the pool's current nomination set.
      </p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          No need to manage validators manually.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          Earn rewards with a smaller bond than direct nomination.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          Withdraw anytime after the unbonding period.
        </li>
      </ul>
      <DialogButton
        disabled={cantJoinReason != null}
        title="Join Pool"
        content={() => <JoinPoolModal poolId={poolId} />}
      >
        Join pool
      </DialogButton>
      {cantJoinReason ? (
        <p className="text-xs text-muted-foreground">{cantJoinReason}</p>
      ) : null}
    </Card>
  );
};

const pool$ = state((id: number) =>
  stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPool$(id)))
);

const joinPool = (poolId: number, amount: bigint): Promise<void> => {
  // Will implement later
  return new Promise(() => {});
};

const JoinPoolModal: FC<{ poolId: number }> = ({ poolId }) => {
  const pool = useStateObservable(pool$(poolId));

  // TODO
  return null;
};
