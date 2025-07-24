import { accountBalance$ } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import { TokenValue } from "@/components/TokenValue";
import { stakingApi$ } from "@/state/chain";
import { activeEra$ } from "@/state/era";
import { state, useStateObservable } from "@react-rxjs/core";
import { defer, map, repeat, skip, switchMap } from "rxjs";
import {
  bondableAmount$,
  minBond$,
  MinBondingAmounts,
} from "./MinBondingAmounts";

export const NotNominatingContent = () => {
  const minBond = useStateObservable(minBond$);
  const bondableAmount = useStateObservable(bondableAmount$);

  return (
    <div>
      <MinBondingAmounts />
      <Card title="Start nominating">
        {bondableAmount == null
          ? "Select an account to start nominating"
          : bondableAmount > minBond
            ? null
            : null}
      </Card>
    </div>
  );
};
