import { CardPlaceholder } from "@/components/CardPlaceholder"
import { NavMenu } from "@/components/NavMenu/NavMenu"
import { isNominating$ } from "@/state/nominate"
import { useStateObservable } from "@react-rxjs/core"
import { Suspense } from "react"
import { NominatingContent, nominatingContentSub$ } from "./Nominating"
import { NotNominatingContent, notNominatingContentSub$ } from "./NotNominating"
import { switchMap } from "rxjs"

export const Nominate = () => {
  return (
    <div>
      <NavMenu />
      <Suspense fallback={<NominateSkeleton />}>
        <NominateContent />
      </Suspense>
    </div>
  )
}

export const nominateSub$ = isNominating$.pipe(
  switchMap((v) => (v ? nominatingContentSub$ : notNominatingContentSub$)),
)

const NominateContent = () => {
  const isNominating = useStateObservable(isNominating$)

  return isNominating ? <NominatingContent /> : <NotNominatingContent />
}

const NominateSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={400} />
    <CardPlaceholder height={400} />
  </div>
)
