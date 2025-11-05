import * as React from "react"
import { cn } from "@/lib/utils"

interface EraRangeSliderProps {
  minEra: number
  maxEra: number
  startEra: number
  endEra: number
  onRangeChange: (start: number, end: number) => void
  className?: string
}

type DragMode = "none" | "start" | "end" | "range"

export function EraRangeSlider({
  minEra,
  maxEra,
  startEra,
  endEra,
  onRangeChange,
  className,
}: EraRangeSliderProps) {
  const [values, setValues] = React.useState([startEra, endEra])
  const [dragMode, setDragMode] = React.useState<DragMode>("none")
  const [dragStartX, setDragStartX] = React.useState(0)
  const [dragStartValues, setDragStartValues] = React.useState<number[]>([])
  const trackRef = React.useRef<HTMLDivElement>(null)

  // Update internal state when props change
  React.useEffect(() => {
    setValues([startEra, endEra])
  }, [startEra, endEra])

  const getValueFromPosition = (clientX: number): number => {
    if (!trackRef.current) return minEra

    const rect = trackRef.current.getBoundingClientRect()
    const percentage = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    )
    return Math.round(minEra + percentage * (maxEra - minEra))
  }

  const getPositionPercentage = (value: number): number => {
    return ((value - minEra) / (maxEra - minEra)) * 100
  }

  const handleMouseDown = (e: React.MouseEvent, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    setDragMode(mode)
    setDragStartX(e.clientX)
    setDragStartValues([...values])
  }

  React.useEffect(() => {
    if (dragMode === "none") return

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return

      if (dragMode === "start") {
        const newStart = Math.min(
          getValueFromPosition(e.clientX),
          values[1] - 1,
        )
        const newValues = [newStart, values[1]]
        setValues(newValues)
        onRangeChange(newValues[0], newValues[1])
      } else if (dragMode === "end") {
        const newEnd = Math.max(getValueFromPosition(e.clientX), values[0] + 1)
        const newValues = [values[0], newEnd]
        setValues(newValues)
        onRangeChange(newValues[0], newValues[1])
      } else if (dragMode === "range") {
        const rect = trackRef.current.getBoundingClientRect()
        const deltaX = e.clientX - dragStartX
        const deltaValue = Math.round((deltaX / rect.width) * (maxEra - minEra))

        const rangeSize = dragStartValues[1] - dragStartValues[0]
        let newStart = dragStartValues[0] + deltaValue
        let newEnd = dragStartValues[1] + deltaValue

        // Constrain to boundaries
        if (newStart < minEra) {
          newStart = minEra
          newEnd = minEra + rangeSize
        }
        if (newEnd > maxEra) {
          newEnd = maxEra
          newStart = maxEra - rangeSize
        }

        const newValues = [newStart, newEnd]
        setValues(newValues)
        onRangeChange(newValues[0], newValues[1])
      }
    }

    const handleMouseUp = () => {
      setDragMode("none")
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    dragMode,
    dragStartX,
    dragStartValues,
    values,
    minEra,
    maxEra,
    onRangeChange,
  ])

  const startPercentage = getPositionPercentage(values[0])
  const endPercentage = getPositionPercentage(values[1])
  const rangeSize = values[1] - values[0]

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex justify-between text-sm font-medium">
        <div className="text-foreground">
          From Era: <span className="font-bold">{values[0] + 1}</span>
        </div>
        <div className="text-foreground text-center">
          Range: <span className="font-bold">{rangeSize}</span>{" "}
          {rangeSize === 1 ? "era" : "eras"}
        </div>
        <div className="text-foreground">
          To Era: <span className="font-bold">{values[1]}</span>
        </div>
      </div>

      <div className="relative w-full py-2">
        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-1.5 w-full rounded-full bg-muted"
        >
          <div
            className={cn(
              "absolute h-full rounded-full bg-pink-500",
              dragMode === "range" ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{
              left: `${startPercentage}%`,
              right: `${100 - endPercentage}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, "range")}
          />

          <div
            className={cn(
              "absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pink-500 bg-white shadow-lg transition-colors hover:bg-pink-50 cursor-grab",
              dragMode === "start" && "cursor-grabbing scale-110",
            )}
            style={{ left: `${startPercentage}%` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
          />

          <div
            className={cn(
              "absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pink-500 bg-white shadow-lg transition-colors hover:bg-pink-50 cursor-grab",
              dragMode === "end" && "cursor-grabbing scale-110",
            )}
            style={{ left: `${endPercentage}%` }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
          />
        </div>
      </div>
    </div>
  )
}
