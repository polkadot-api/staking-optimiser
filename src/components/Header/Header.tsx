import { Link } from "react-router-dom";
import { ChainSelector } from "./ChainSelector";
import { SelectAccount } from "./SelectAccount";
import { USE_CHOPSTICKS } from "@/state/chainConfig";
import { ChopsticksController } from "../ChopsticksController";

export const Header = () => (
  <div className="shrink-0 border-b">
    <div className="flex p-4 items-center gap-2 container m-auto">
      <div className="flex flex-1 items-center flex-row gap-2 relative">
        <Link to="/">Staking Optimizer</Link>
      </div>
      <SelectAccount />
      {USE_CHOPSTICKS ? <ChopsticksController /> : <ChainSelector />}
    </div>
  </div>
);
