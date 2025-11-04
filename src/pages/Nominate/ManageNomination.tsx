import { CardPlaceholder } from "@/components/CardPlaceholder"
import { lazy, Suspense } from "react"
import { merge } from "rxjs"
import { BondInput, bondInputSub$ } from "./BondInput"

const PickValidators = lazy(async () => {
  const module = await import("./PickValidators")
  module.pickValidatorsSub$.subscribe()
  return module
})

const ManageNominationParams = lazy(async () => {
  const module = await import("./ManageNominationParams")
  // module.pickValidatorsSub$.subscribe()
  return module
})

export const ManageNomination = () => {
  return (
    <Suspense fallback={<ManageNominationSkeleton />}>
      <div className="space-y-2">
        <BondInput />
        <ManageNominationParams />
        <PickValidators />
      </div>
    </Suspense>
  )
}

export const manageNominationSub$ = merge(bondInputSub$)

const ManageNominationSkeleton = () => {
  return (
    <div className="space-y-2">
      <CardPlaceholder height={165} />
      <CardPlaceholder height={430} />
      <CardPlaceholder height={150} />
      <CardPlaceholder />
    </div>
  )
}
