import type { PropsWithChildren } from "react"
import { EmptyValidatorSlot, ValidatorCard } from "./ValidatorCard.tsx"
import { MAX_VALIDATORS } from "./pickValidators.state.ts"

export interface Validator {
  address: string
  apy: number
}

interface ValidatorGridProps {
  selectedValidators: Validator[]
  onRemove: (address: string) => void
}

export const ValidatorGrid: React.FC<PropsWithChildren<ValidatorGridProps>> = ({
  selectedValidators,
  onRemove,
  children,
}) => {
  const emptySlots = MAX_VALIDATORS - selectedValidators.length
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Select up to {MAX_VALIDATORS} validators
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {selectedValidators.map((validator) => (
          <ValidatorCard
            key={validator.address}
            address={validator.address}
            apy={validator.apy}
            onRemove={onRemove}
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <EmptyValidatorSlot key={`empty-${index}`} />
        ))}
      </div>

      {selectedValidators.length === MAX_VALIDATORS && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum validators selected. Remove one to select another.
        </p>
      )}
      {children}
    </div>
  )
}
