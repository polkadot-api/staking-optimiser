import { Link } from "react-router-dom";
import { SelectAccount } from "./SelectAccount";

export const Header = () => (
  <div className="shrink-0 border-b">
    <div className="flex p-4 items-center gap-2 container m-auto">
      <div className="flex flex-1 items-center flex-row gap-2 relative">
        <Link to="/">Staking Optimizer</Link>
      </div>
      <SelectAccount />
    </div>
  </div>
);
