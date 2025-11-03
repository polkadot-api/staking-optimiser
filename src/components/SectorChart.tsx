import { tokenProps$ } from "@/state/chain"
import { amountToNumber } from "@/util/format"
import { useStateObservable } from "@react-rxjs/core"
import { Cell, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"

const DEFAULT_COLOR = "var(--primary)"

const CHART_SIZE = 220
const CHART_MARGINS = 20
const SECTOR_WIDTH = 32

export default function SectorChart({
  data,
}: {
  data: {
    label: string
    value: bigint
    color?: string
  }[]
}) {
  const tokenProps = useStateObservable(tokenProps$)
  if (!tokenProps) return null

  const outerRadius = CHART_SIZE / 2 - CHART_MARGINS
  return (
    <PieChart width={CHART_SIZE} height={CHART_SIZE}>
      <Pie
        activeShape={ActiveShape}
        data={data.map((v) => ({
          ...v,
          value: amountToNumber(v.value, tokenProps.decimals),
        }))}
        cx="50%"
        cy="50%"
        innerRadius={outerRadius - SECTOR_WIDTH}
        outerRadius={outerRadius}
        fill={DEFAULT_COLOR}
        dataKey="value"
        paddingAngle={1}
        startAngle={90}
        endAngle={90 - 360}
      >
        {data.map((entry) => (
          <Cell
            key={`cell-${entry.label}`}
            fill={entry.color ?? DEFAULT_COLOR}
          />
        ))}
      </Pie>
    </PieChart>
  )
}

const ActiveShape = ({
  cx,
  cy,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  payload,
  value,
}: PieSectorDataItem) => {
  const tokenProps = useStateObservable(tokenProps$)
  if (!tokenProps) return <></>

  const fillWithoutTransparency = fill?.replace(
    /transparent \d+%/,
    "transparent 0%",
  )

  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        dy={8}
        textAnchor="middle"
        fill={fillWithoutTransparency}
      >
        {payload.label}
      </text>
      <text
        x={cx}
        y={cy + 8}
        dy={8}
        textAnchor="middle"
        fill="#333a"
        fontSize="0.9rem"
      >
        {value?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={(outerRadius ?? 0) + 6}
        outerRadius={(outerRadius ?? 0) + 10}
        fill={fill}
      />
    </g>
  )
}
