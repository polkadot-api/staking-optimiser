import { CardPlaceholder } from "@/components/CardPlaceholder"
import { isNominating$ } from "@/state/nominate"
import { useStateObservable } from "@react-rxjs/core"
import { Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { merge } from "rxjs"
import { NominatingContent, nominatingContentSub$ } from "./Nominating"
import {
  UpsertNomination,
  upsertNomination$,
} from "./UpsertNomination/UpsertNomination"

export const Nominate = () => {
  return (
    <Routes>
      <Route
        path="/config"
        element={
          <Suspense fallback={<NominateSkeleton />}>
            <UpsertNomination />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <Suspense fallback={<NominateSkeleton />}>
            <NominateContent />
          </Suspense>
        }
      />
    </Routes>
  )
}

export const nominateSub$ = merge(
  isNominating$,
  nominatingContentSub$,
  upsertNomination$,
)

const NominateContent = () => {
  const isNominating = useStateObservable(isNominating$)
  return (
    <Routes>
      <Route
        path="/"
        element={
          isNominating ? (
            <NominatingContent />
          ) : (
            <Navigate to="config" replace />
          )
        }
      />
    </Routes>
  )
}

const NominateSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={400} />
    <CardPlaceholder height={400} />
  </div>
)
