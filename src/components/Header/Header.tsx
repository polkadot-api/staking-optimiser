import { Link } from "react-router-dom";
import { ChainSelector } from "./ChainSelector";
import { SelectAccount } from "./SelectAccount";
import { ChopsticksController } from "../ChopsticksController";

export const Header = () => (
  <div className="shrink-0 border-b">
    <div className="flex p-4 items-center gap-2 container m-auto">
      <div className="flex flex-1 items-center flex-row gap-2 relative">
        <Link to="/">
          <img alt="logo" src="/staking.svg" className="w-10 inline-block" />
        </Link>
      </div>
      <SelectAccount />
      {import.meta.env.VITE_WITH_CHOPSTICKS ? (
        <ChopsticksController />
      ) : (
        <ChainSelector />
      )}
    </div>
  </div>
);
