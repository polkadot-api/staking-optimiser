import { type OperatorFunction, pipe, withLatestFrom, scan, map } from "rxjs";
import { activeEraNumber$ } from "./era";

export const accumulateChart = <T extends { era: number }>(): OperatorFunction<
  T | null,
  T[]
> =>
  pipe(
    withLatestFrom(activeEraNumber$),
    scan(
      (
        acc: {
          start: number;
          result: T[];
        },
        [value, era]
      ) => {
        if (!value) {
          return acc;
        }

        if (!acc.result.length) {
          acc.start = era;
          const idx = acc.start - 1 - value.era;
          acc.result[idx] = value;
          return acc;
        }

        if (era != acc.start) {
          // Era has changed, shift result
          return {
            start: era,
            result: [value, ...acc.result],
          };
        }
        const idx = acc.start - 1 - value.era;
        acc.result[idx] = value;

        return acc;
      },
      { start: 0, result: [] }
    ),
    map((v) => v.result)
  );
