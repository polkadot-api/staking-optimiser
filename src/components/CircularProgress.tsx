import { cn } from "@/lib/utils";
import type { FC } from "react";

const SIZE = 50;
const STROKE_W = 3;
const CENTER = SIZE / 2;
const RADIUS = CENTER - STROKE_W;
const PERIMTER = Math.PI * 2 * RADIUS;
export const CircularProgress: FC<{
  text?: string;
  progress: number | null;
  className?: string;
}> = ({ text, progress, className }) => {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("stroke-primary", className)}
    >
      <path
        d={`
          M${CENTER} ${STROKE_W}
          a ${RADIUS} ${RADIUS} 0 0 1 0 ${RADIUS * 2}
          a ${RADIUS} ${RADIUS} 0 0 1 0 -${RADIUS * 2}
        `}
        strokeWidth={STROKE_W}
        fill="transparent"
        opacity="0.3"
      />
      {progress ? (
        <path
          d={`
          M${CENTER} ${STROKE_W}
          a ${RADIUS} ${RADIUS} 0 0 1 0 ${RADIUS * 2}
          a ${RADIUS} ${RADIUS} 0 0 1 0 -${RADIUS * 2}
        `}
          strokeDasharray={`${progress * PERIMTER} ${PERIMTER}`}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all ease-linear"
          opacity="0.7"
        />
      ) : null}
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dy=".3em"
        className="tabular-nums fill-foreground/80"
      >
        {text}
      </text>
    </svg>
  );
};
