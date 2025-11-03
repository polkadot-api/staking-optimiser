import { codeSplit } from "@/util/codeSplit"
import { withSubscribe } from "@/util/rxjs"
import { PolkaHubModalTrigger } from "polkahub"

const payload = Promise.all([
  import("./ConnectSource"),
  import("polkahub").then(
    ({ PolkaHubModal, SelectAccountField, ManagePjsWallets }) => ({
      PolkaHubModal,
      SelectAccountField,
      ManagePjsWallets,
    }),
  ),
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
        <PolkaHubModal>
          <SelectAccountField />
          <ManagePjsWallets />
          <ConnectSource />
        </PolkaHubModal>
      )
    },
  ),
)
