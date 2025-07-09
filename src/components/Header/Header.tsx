import { Link } from "react-router-dom";

export const Header = () => (
  <div className="shrink-0 border-b">
    <div className="flex p-4 items-center gap-2 container m-auto">
      <div className="flex flex-1 items-center flex-row gap-2 relative">
        <Link to="/">Staking Optimizer</Link>
      </div>
      <div className="flex items-center gap-2">Account here</div>
    </div>
  </div>
);
