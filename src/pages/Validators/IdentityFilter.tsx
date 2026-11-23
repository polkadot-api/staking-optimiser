import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useStateObservable } from "@react-rxjs/core"
import { useId } from "react"
import {
  filterIdentity$,
  retryIdentities,
  setFilterIdentity,
  validatorIdentities$,
} from "./validatorList.state"

export const IdentityFilter = () => {
  const id = useId()
  const enabled = useStateObservable(filterIdentity$)
  const identities = useStateObservable(validatorIdentities$)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-sm cursor-pointer">
          Identity set
        </label>
        <Switch id={id} checked={enabled} onCheckedChange={setFilterIdentity} />
      </div>
      {enabled && identities.status === "loading" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading identities…
        </p>
      ) : enabled && identities.status === "error" ? (
        <div role="alert" className="text-sm text-destructive">
          Could not load identities.
          <Button variant="link" size="sm" onClick={() => retryIdentities()}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  )
}
