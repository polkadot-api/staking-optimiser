import { tokenProps$ } from "@/state/chain";
import { useTokenInput } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { type FC } from "react";
import { Input } from "./ui/input";

export const TokenInput: FC<
  {
    value?: bigint | null;
    onChange?: (value: bigint | null) => void;
  } & Omit<React.ComponentProps<"input">, "value" | "onChange">
> = ({ value, onChange, ...props }) => {
  const token = useStateObservable(tokenProps$);
  const inputProps = useTokenInput(token, value, onChange);

  return <Input {...props} type="text" {...inputProps} />;
};
