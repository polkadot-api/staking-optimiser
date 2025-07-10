export const roundToDecimalPlaces = (value: number, decimals: number) =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;
