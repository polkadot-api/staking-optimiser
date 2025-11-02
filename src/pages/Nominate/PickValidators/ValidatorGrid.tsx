import type { PropsWithChildren } from "react";
import { NominateButton } from "../NominateButton.tsx";
import { ValidatorCard, EmptyValidatorSlot } from "./ValidatorCard.tsx";

export interface Validator {
  address: string;
  apy: number;
}

interface ValidatorGridProps {
  selectedValidators: Validator[];
  onRemove: (address: string) => void;
}

const MAX_SELECTION = 16;
export const ValidatorGrid: React.FC<PropsWithChildren<ValidatorGridProps>> = ({
  selectedValidators,
  onRemove,
  children,
}) => {
  const emptySlots = MAX_SELECTION - selectedValidators.length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select up to 16 validators</h3>
        <NominateButton />
      </div>

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

      {selectedValidators.length === MAX_SELECTION && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum validators selected. Remove one to select another.
        </p>
      )}
      {children}
    </div>
  );
};
