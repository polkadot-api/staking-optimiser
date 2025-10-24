import { AddressIdentity } from "@/components/AddressIdentity";
import { ContractableText } from "@/components/SortBy";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/util/format";
import { useStateObservable } from "@react-rxjs/core";
import { sortedValidators$, validatorPrefs$ } from "./validatorList.state";

export default function TopValidators() {
  const validators = useStateObservable(sortedValidators$).slice(0, 10);
  const prefs = useStateObservable(validatorPrefs$);

  return (
    <div className="data-table compact">
      <table>
        <thead>
          <tr className="bg-background">
            <th>Validator</th>
            <th>APY</th>
            <th>
              <ContractableText smol="Comm.">Commission</ContractableText>
            </th>
            <th>
              <ContractableText smol="# Nom.">Nominators</ContractableText>
            </th>
          </tr>
        </thead>
        <tbody>
          {validators.map((validator, idx) => {
            const vPrefs = prefs[validator.address];

            return (
              <tr
                key={validator.address}
                className={cn({
                  "bg-muted": idx % 2 === 0,
                  "bg-destructive/5": !vPrefs || vPrefs.blocked,
                  "bg-destructive/10":
                    (!vPrefs || vPrefs.blocked) && idx % 2 === 0,
                })}
              >
                <td>
                  <AddressIdentity addr={validator.address} />
                </td>
                <td
                  className={cn("text-right font-bold", {
                    "text-positive": validator.nominatorApy > 0,
                  })}
                >
                  {formatPercentage(validator.nominatorApy)}
                </td>
                <td className="text-right">
                  {formatPercentage(validator.commission)}
                </td>
                <td className="text-right">
                  {Math.round(validator.nominatorQuantity).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
