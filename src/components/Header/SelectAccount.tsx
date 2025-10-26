import { codeSplit } from "@/util/codeSplit";
import { withSubscribe } from "@/util/rxjs";
import { SelectAccountModalTrigger } from "polkahub";

const payload = Promise.all([
  import("polkahub"),
  import("./ConnectSource"),
  import("polkahub").then(({ AccountSelector, ManagePjsWallets }) => ({
    AccountSelector,
    ManagePjsWallets,
  })),
]);
export const SelectAccount = withSubscribe(
  codeSplit(
    payload,
    () => <SelectAccountModalTrigger />,
    ({ payload }) => {
      const [
        { SelectAccountModal },
        { ConnectSource },
        { AccountSelector, ManagePjsWallets },
      ] = payload;

      return (
        <SelectAccountModal>
          <AccountSelector />
          <ManagePjsWallets />
          <ConnectSource />
        </SelectAccountModal>
      );
    }
  )
);
