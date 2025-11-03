import { absBigInt } from "./bigint"

export const roundToDecimalPlaces = (value: number, decimals: number) =>
  Math.round(value * 10 ** decimals) / 10 ** decimals

export const amountToNumber = (amount: bigint, decimals: number) =>
  Number(amount) / 10 ** decimals

export const amountToParts = (amount: bigint, decimals: number) => {
  const mod = 10n ** BigInt(decimals)

  return {
    integer: (amount / mod).toString(),
    fraction: (absBigInt(amount) % mod).toString().padStart(decimals, "0"),
  }
}

export const formatPercentage = (value: number) =>
  (value * 100).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%"
