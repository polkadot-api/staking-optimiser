import {
  Suspense,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from "react"
import { Card } from "../Card"
import { CircularProgress } from "../CircularProgress"
import { cn } from "@polkahub/ui-components"

export const InfoCard: FC<
  PropsWithChildren<{ title: string; className?: string; fallback?: ReactNode }>
> = ({ title, children, className, fallback }) => (
  <Card
    title={title}
    className={cn("text-sm flex flex-col w-36", className)}
    titleClassName="w-full text-center"
  >
    <Suspense fallback={fallback ?? <InfoPlaceholder />}>{children}</Suspense>
  </Card>
)

export const InfoPlaceholder: FC<{ className?: string }> = ({ className }) => (
  <div className="flex flex-col items-center">
    <CircularProgress className={className} progress={0} />
    <div>…</div>
  </div>
)
