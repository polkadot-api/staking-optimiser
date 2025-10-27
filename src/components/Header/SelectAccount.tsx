import { codeSplit } from "@/util/codeSplit";
import { withSubscribe } from "@/util/rxjs";
import { PolkaHubModalTrigger } from "polkahub";

const payload = Promise.all([
  import("polkahub"),
  import("./ConnectSource"),
  import("polkahub").then(({ SelectAccountField, ManagePjsWallets }) => ({
    SelectAccountField,
    ManagePjsWallets,
  })),
]);
export const SelectAccount = withSubscribe(
  codeSplit(
    payload,
    () => <PolkaHubModalTrigger />,
    ({ payload }) => {
      const [
        { PolkaHubModal },
        { ConnectSource },
        { SelectAccountField, ManagePjsWallets },
      ] = payload;

      return (
        <PolkaHubModal>
          <SelectAccountField />
          <ManagePjsWallets />
          <ConnectSource />
        </PolkaHubModal>
      );
    }
  )
);
