import { cn } from "@/lib/utils";
import { tokenProps$ } from "@/state/chain";
import { amountToParts } from "@/util/format";
import { useStateObservable } from "@react-rxjs/core";
import type { FC } from "react";

const decimalPoint = (0.1).toLocaleString().slice(1, 2);

export const significantDigitsDecimals =
  (significantDigits: number, min: number = 0) =>
  (value: bigint, tokenDecimals: number) => {
    const TOKEN_UNIT = 10n ** BigInt(tokenDecimals);
    const integerLength =
      value / TOKEN_UNIT === 0n ? 0 : (value / TOKEN_UNIT).toString().length;
    return Math.max(min, significantDigits - integerLength);
  };

export const fixedDecimals = (decimals: number) => () => decimals;
export const allDecimals = () => (_: bigint, tokenDecimals: number) =>
  tokenDecimals;

export const TokenValue: FC<{
  value: bigint;
  decimalsFn?: (integerPart: bigint, tokenDecimals: number) => number;
  className?: string;
  colored?: boolean;
}> = ({
  value,
  decimalsFn = significantDigitsDecimals(3, 2),
  className,
  colored = true,
}) => {
  const tokenProps = useStateObservable(tokenProps$);
  if (!tokenProps) return null;
  const { decimals: tokenDecimals, symbol } = tokenProps;

  const { integer, fraction } = amountToParts(value, tokenDecimals);

  const decimals = decimalsFn(value, tokenDecimals);
  const decimalPart =
    decimals > 0
      ? `${decimalPoint}${fraction
          .slice(0, decimals)
          .replace(/0+$/, "")
          .padEnd(decimals, "0")}`
      : null;

  return (
    <span className={cn(colored ? "text-foreground" : "", className)}>
      <span>{Number(integer).toLocaleString()}</span>
      {decimalPart && (
        <span className={colored ? "text-foreground/75" : undefined}>
          {decimalPart}
        </span>
      )}
      <span> {symbol}</span>
    </span>
  );
};
