import { Card } from "@/components/Card";
import { useStateObservable } from "@react-rxjs/core";
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
