import { cn } from "@polkahub/ui-components"
import type { FC } from "react"

export const CardPlaceholder: FC<{ height?: number; className?: string }> = ({
  height = 100,
  className,
}) => (
  <div
    className={cn("bg-muted w-full rounded-xl shadow animate-pulse", className)}
    style={{ height }}
  />
)
