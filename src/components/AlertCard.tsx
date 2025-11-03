import { AlertOctagon, Info, TriangleAlert } from "lucide-react"
import type { FC, PropsWithChildren } from "react"

export const AlertCard: FC<
  PropsWithChildren<{
    type: "info" | "warning" | "error"
  }>
> = ({ type, children }) => {
  const Icon =
    type === "info" ? Info : type === "warning" ? TriangleAlert : AlertOctagon
  const color =
    type === "info"
      ? `var(--color-positive)`
      : type === "warning"
        ? `var(--color-warning)`
        : `var(--color-negative)`

  return (
    <div
      className="flex items-center gap-2 border-2 rounded-lg p-2"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color}, transparent 92%)`,
      }}
    >
      <Icon className="shrink-0" />
      <div>{children}</div>
    </div>
  )
}
