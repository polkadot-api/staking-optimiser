import { awaitedOthers } from "@/lazy-polkahub"
import { codeSplit } from "@/util/codeSplit"
import { withSubscribe } from "@/util/rxjs"
import { PolkaHubModalTrigger } from "polkahub"

const payload = Promise.all([
  import("./ConnectSource"),
  awaitedOthers,
])
export const SelectAccount = withSubscribe(
  codeSplit(
    payload,
    () => <PolkaHubModalTrigger />,
    ({ payload }) => {
      const [
        { ConnectSource },
        { PolkaHubModal, SelectAccountField, ManagePjsWallets },
      ] = payload

      return (
        <PolkaHubModal className="[&>div]:hidden [&>div]:md:block">
          <SelectAccountField />
          <ManagePjsWallets />
          <ConnectSource />
        </PolkaHubModal>
      )
    },
  ),
)
