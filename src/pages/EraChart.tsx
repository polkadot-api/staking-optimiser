import { TOKEN_PROPS } from "@/constants";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function EraChart({
  data,
  activeEra,
}: {
  data: {
    era: number;
    rewards: number;
  }[];
  activeEra: number;
}) {
  return (
    <ResponsiveContainer height={400} className="overflow-hidden">
      <ComposedChart
        data={data}
        margin={{
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
        }}
        style={{
          backgroundColor: "white",
        }}
      >
        <CartesianGrid stroke="#f5f5f5" />
        <XAxis
          dataKey="era"
          scale="time"
          type="number"
          domain={[activeEra - 21 + 1, activeEra - 1]}
          ticks={[]}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(label, payload) =>
            payload[0].value
              ? `Era ${label}: ${payload[0].value.toLocaleString()} ${TOKEN_PROPS.symbol}`
              : label
          }
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
      </ComposedChart>
    </ResponsiveContainer>
  );
}
