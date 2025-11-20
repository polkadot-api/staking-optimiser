import { DialogButton } from "@/components/DialogButton"
import { Button } from "@/components/ui/button"
import { merge } from "rxjs"
import { pickValidatorsSub$ } from "../PickValidators"
import { BondInput, bondInputSub$ } from "./BondInput"
import { NominateButton, nominateButton$ } from "./NominateButton"
import { PayeePicker, payeePicker$ } from "./PayeePicker"
import { Nominations } from "../PickValidators/PickValidators"
import { isNominating$ } from "@/state/nominate"
import { useStateObservable } from "@react-rxjs/core"
import { useNavigate } from "react-router"
import { StopNominating } from "../StopNominating"

export const manageNomination$ = merge(
  isNominating$,
  bondInputSub$,
  payeePicker$,
  nominateButton$,
  pickValidatorsSub$,
)

const ManageNomination = () => {
  const isNominating = useStateObservable(isNominating$)
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
        <BondInput />
      </div>
      <div className="rounded-lg border border-border/60 bg-background/90 p-4">
        <PayeePicker />
      </div>
      <div className="rounded-lg border border-border/60 bg-background/90 p-4">
        <p className="text-sm font-medium">Nominations</p>
        <Nominations />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        {isNominating && (
          <>
            <Button
              onClick={() => navigate("../")}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Nomination Dashboard
            </Button>
            <DialogButton
              title="Stop nominating"
              content={({ close }) => <StopNominating close={close} />}
              needsSigner
            >
              Stop nominating
            </DialogButton>
          </>
        )}
        <NominateButton />
      </div>
    </div>
  )
}

export default ManageNomination
