import { TOKEN_PROPS } from "@/constants";
import { cn } from "@/lib/utils";
import type { FC } from "react";

const TOKEN_UNIT = 10n ** BigInt(TOKEN_PROPS.decimals);
const decimalPoint = (0.1).toLocaleString().slice(1, 2);

export const significantDigitsDecimals =
  (significantDigits: number, min: number = 0) =>
  (value: bigint) => {
    const integerLength =
      value / TOKEN_UNIT === 0n ? 0 : (value / TOKEN_UNIT).toString().length;
    return Math.max(min, significantDigits - integerLength);
  };

export const fixedDecimals = (decimals: number) => () => decimals;
export const allDecimals = () => fixedDecimals(TOKEN_PROPS.decimals);

export const TokenValue: FC<{
  value: bigint;
  decimalsFn?: (integerPart: bigint) => number;
  className?: string;
}> = ({ value, decimalsFn = significantDigitsDecimals(3, 2), className }) => {
  const integerPart = (value / TOKEN_UNIT).toLocaleString();
  const decimalValue = value % TOKEN_UNIT;
  const decimals = decimalsFn(value);
  const decimalPart =
    decimals > 0
      ? `${decimalPoint}${decimalValue
          .toString()
          .padStart(TOKEN_PROPS.decimals, "0")
          .slice(0, decimals)
          .replace(/0+$/, "")
          .padEnd(decimals, "0")}`
      : null;

  return (
    <span className={cn("text-foreground", className)}>
      <span>{integerPart}</span>
      {decimalPart && <span className="text-foreground/75">{decimalPart}</span>}
      <span className="ml-1">{TOKEN_PROPS.symbol}</span>
    </span>
  );
};
