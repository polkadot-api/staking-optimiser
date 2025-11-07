import { HISTORY_DEPTH } from "@/constants"
import { tokenProps$ } from "@/state/chain"
import { useStateObservable } from "@react-rxjs/core"
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
} from "recharts"

export default function EraChart({
  data,
  activeEra,
  height = 400,
}: {
  data: {
    era: number
    rewards?: number
    apy?: number | null
    isActive?: boolean
  }[]
  activeEra: number
  height?: number
}) {
  const tokenProps = useStateObservable(tokenProps$)
  const mappedData = data.map((v) => ({
    ...v,
    active: v.isActive ? (v.apy ?? v.rewards) : undefined,
  }))

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
        <YAxis width={data[0]?.rewards ? 55 : 40} />
        <Tooltip
          labelFormatter={(label, payload) => {
            const eraPayload = payload.find((p) => p.name === "era")
            const apyPayload = payload.find((p) => p.name === "apy")
            const rewardsPayload = payload.find((p) => p.name === "rewards")

            if (!eraPayload?.value) return label

            const era = eraPayload.value.toLocaleString()
            const isActive = eraPayload.payload?.active

            if (apyPayload?.value == null && rewardsPayload?.value == null)
              return `Era ${era}`

            const content =
              rewardsPayload?.value != null
                ? `${rewardsPayload.value.toLocaleString()} ${tokenProps?.symbol}`
                : apyPayload?.value
                  ? `${apyPayload?.value?.toLocaleString()}%`
                  : null

            const eraValue = [content, isActive ? "(Active)" : null]
              .filter((v) => !!v)
              .join(" ")

            return `Era ${era}` + (eraValue ? `: ${eraValue}` : "")
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
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
