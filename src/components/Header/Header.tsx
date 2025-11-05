import { Link, useParams } from "react-router-dom"
import { ChainSelector } from "./ChainSelector"
import { SelectAccount } from "./SelectAccount"
import { ChopsticksController } from "../ChopsticksController"
import { NavMenu } from "../NavMenu/NavMenu"

export const Header = () => {
  const { chain } = useParams()

  return (
    <div className="shrink-0 border-b">
      <div className="flex p-4 items-center gap-2 container m-auto">
        <div className="flex flex-1 items-center flex-row gap-4 relative">
          <Link to={`/${chain}/dashboard`}>
            <img
              alt="logo"
              src="/android-chrome-192x192.png"
              className="w-10 inline-block"
            />
          </Link>
          <NavMenu />
        </div>
        <SelectAccount />
        {import.meta.env.VITE_WITH_CHOPSTICKS ? (
          <ChopsticksController />
        ) : (
          <ChainSelector />
        )}
      </div>
    </div>
  )
}
