import { CardPlaceholder } from "@/components/CardPlaceholder"
import { location$ } from "@/router"
import { lazy, Suspense } from "react"
import { matchPath, Route, Routes } from "react-router-dom"
import { map, switchMap } from "rxjs"
import { ValidatorDetailPage, validatorDetailPageSub$ } from "./ValidatorDetail"

const ValidatorList = lazy(async () => {
  const module = await import("./ValidatorList")
  module.validatorList$.subscribe()
  return module
})

export const Validators = () => {
  return (
    <Suspense fallback={<ValidatorsSkeleton />}>
      <Routes>
        <Route path=":address" Component={ValidatorDetailPage} />
        <Route path="*" element={<ValidatorList />} />
      </Routes>
    </Suspense>
  )
}

const routedDetail$ = location$.pipe(
  map(
    (location) =>
      matchPath("/:chainId/validators/:address", location.pathname)?.params
        .address,
  ),
  switchMap((id) => (id ? validatorDetailPageSub$(id) : [])),
)
export const validatorsSub$ = routedDetail$

export const ValidatorsSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={170} />
    <CardPlaceholder height={500} />
  </div>
)
