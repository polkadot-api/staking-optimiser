import { TOKEN_PROPS } from "@/constants";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

const DEFAULT_COLOR = "var(--primary)";

export default function SectorChart({
  data,
}: {
  data: {
    label: string;
    value: bigint;
    color?: string;
  }[];
}) {
  return (
    <ResponsiveContainer height={400} className="overflow-hidden">
      <PieChart width={400} height={400}>
        <Pie
          activeShape={renderActiveShape}
          data={data.map((v) => ({
            ...v,
            value: tokenToAmount(v.value),
          }))}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill={DEFAULT_COLOR}
          dataKey="value"
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
    </ResponsiveContainer>
  );
}

const renderActiveShape = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  payload,
  percent,
  value,
}: PieSectorDataItem) => {
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * (midAngle ?? 1));
  const cos = Math.cos(-RADIAN * (midAngle ?? 1));
  const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
  const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
  const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
  const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.label}
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
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
      >{`${value?.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })} ${TOKEN_PROPS.symbol}`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#999"
      >
        {`(${((percent ?? 1) * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

const tokenToAmount = (value: bigint) =>
  Number(value) / 10 ** TOKEN_PROPS.decimals;
