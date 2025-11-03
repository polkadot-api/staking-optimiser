import { cn } from "@/lib/utils"
import { useId, type FC, type PropsWithChildren, type ReactNode } from "react"
import { TextHintTooltip } from "./HintTooltip"

export const Card: FC<
  PropsWithChildren<{
    title?: ReactNode
    hint?: string
    className?: string
    titleClassName?: string
  }>
> = ({ title, hint, className, titleClassName, children }) => {
  const titleId = useId()

  return (
    <article
      className={cn(
        "p-4 shadow rounded-xl bg-card text-card-foreground",
        className,
      )}
      role="region"
      aria-labelledby={titleId}
    >
      <div className="flex justify-between">
        <h3
          id={titleId}
          className={cn("font-medium text-muted-foreground", titleClassName)}
        >
          {title}
        </h3>
        {hint ? <TextHintTooltip hint={hint} /> : null}
      </div>
      {children}
    </article>
  )
}
