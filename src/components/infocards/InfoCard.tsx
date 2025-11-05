import { cn } from "@polkahub/ui-components"
import {
  Suspense,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from "react"
import { Card } from "../Card"
import { CircularProgress } from "../CircularProgress"
import { TextHintTooltip } from "../HintTooltip"

export const InfoCard: FC<
  PropsWithChildren<{
    title: string
    tooltip?: string
    className?: string
    fallback?: ReactNode
  }>
> = ({ title, children, className, tooltip, fallback }) => (
  <Card
    title={title}
    className={cn("text-sm flex flex-col w-36 relative group", className)}
    titleClassName="w-full text-center"
  >
    <Suspense fallback={fallback ?? <InfoPlaceholder />}>{children}</Suspense>
    {tooltip ? (
      <TextHintTooltip
        name={`${title.split(' ').join('')}`}
        hint={tooltip}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    ) : null}
  </Card>
)

export const InfoPlaceholder: FC<{ className?: string }> = ({ className }) => (
  <div className="flex flex-col items-center">
    <CircularProgress className={className} progress={0} />
    <div>…</div>
  </div>
)
