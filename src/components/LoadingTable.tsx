import type { PropsWithChildren } from "react"

export const LoadingTable: React.FC<
  PropsWithChildren<{ progress: number }>
> = ({ progress, children }) => {
  const displayProgress = progress * 100
  const innerProgress =
    progress < 1 ? (
      <div className="absolute inset-0 z-50 bg-background/30 backdrop-blur-[1px] transition-opacity duration-300">
        <div className="absolute left-0 right-0 top-0">
          <div className="h-1 w-full bg-secondary/50">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-sm font-semibold text-foreground">
            Loading {Math.round(displayProgress)}%
          </span>
        </div>
      </div>
    ) : null

  return (
    <div className="relative">
      {innerProgress}
      {children}
    </div>
  )
}
