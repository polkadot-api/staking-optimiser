import { HISTORY_DEPTH, TOKEN_PROPS } from "@/constants";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  Scatter,
} from "recharts";

export default function EraChart({
  data,
  activeEra,
  height = 400,
}: {
  data: {
    era: number;
    rewards?: number;
    apy?: number | null;
    isActive?: boolean;
  }[];
  activeEra: number;
  height?: number;
}) {
  const mappedData = data.map((v) => ({
    ...v,
    active: v.isActive ? (v.apy ?? v.rewards) : undefined,
  }));

  return (
    <ResponsiveContainer height={height} className="overflow-hidden">
      <ComposedChart
        data={mappedData}
        margin={{
          top: 20,
          right: 20,
          bottom: 0,
          left: 0,
        }}
      >
        <CartesianGrid stroke="#f5f5f5" />
        <XAxis
          dataKey="era"
          scale="time"
          type="number"
          domain={[activeEra - HISTORY_DEPTH + 1, activeEra - 1]}
          ticks={[]}
          height={20}
        />
        <YAxis width={40} />
        <Tooltip
          labelFormatter={(label, payload) => {
            if (payload[0]?.value == null) {
              return label;
            }

            const formattedValue = payload[0].value.toLocaleString();

            const content =
              payload[0].name === "reward"
                ? `${formattedValue} ${TOKEN_PROPS.symbol}`
                : `${formattedValue}% APY`;

            return `Era ${label}: ${content}${payload[0].payload?.active ? " (Active)" : ""}`;
          }}
          formatter={(...args) => {
            console.log("formatter", ...args);
            return "wtf2";
          }}
        />
        <Area
          dataKey="rewards"
          stroke="var(--chart-2)"
          fill="color-mix(in srgb, var(--chart-2) 20%, transparent)"
          fillOpacity={1}
          strokeWidth={2}
          dot
          activeDot={false}
          legendType="none"
          tooltipType="none"
          type="monotone"
          isAnimationActive={false}
        />
        <Line
          dataKey="apy"
          stroke="var(--muted-foreground)"
          strokeWidth={2}
          dot={{
            r: 2,
          }}
          activeDot={false}
          legendType="none"
          tooltipType="none"
          type="monotone"
          isAnimationActive={false}
        />
        <Scatter
          isAnimationActive={false}
          dataKey="active"
          fill="var(--chart-2)"
          tooltipType="none"
          // shape={<circle r={2} />}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
