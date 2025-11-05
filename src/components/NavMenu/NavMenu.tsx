import { cn } from "@polkahub/ui-components"
import { GitFork, Home, ShieldCheck, Star } from "lucide-react"
import { type FC, type PropsWithChildren } from "react"
import { Link, matchPath, useLocation, useParams } from "react-router-dom"

const pages = [
  {
    path: "/:chain/dashboard",
    label: "Dashboard",
    icon: <Home className="size-7 md:size-5" />,
  },
  {
    path: "/:chain/nominate",
    label: "Nominate",
    icon: <Star className="size-7 md:size-5" />,
  },
  {
    path: "/:chain/pools",
    label: "Pools",
    icon: <GitFork className="size-7 md:size-5" />,
  },
  {
    path: "/:chain/validators",
    label: "Validators",
    icon: <ShieldCheck className="size-7 md:size-5" />,
  },
]

export const NavMenu: FC<PropsWithChildren> = () => {
  const location = useLocation()
  const params = useParams<{ chain: string }>()

  const chainPages = pages.map((v) => ({
    ...v,
    path: v.path.replace(":chain", params.chain!),
  }))
  const matchedPath = chainPages.find((page) =>
    matchPath(page.path + "/*", location.pathname),
  )

  return (
    <nav className="flex gap-4">
      {chainPages.map((page, i) => (
        <Link
          key={page.path}
          to={page.path}
          className={cn(
            "flex gap-1 text-muted-foreground hover:text-foreground items-center",
            {
              "font-bold text-foreground": matchedPath === page,
              "hidden md:flex": i === 0,
            },
          )}
        >
          {page.icon} <span className="hidden md:block">{page.label}</span>
        </Link>
      ))}
    </nav>
  )
}
