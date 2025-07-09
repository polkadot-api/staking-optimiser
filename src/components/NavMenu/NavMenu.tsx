import type { FC, PropsWithChildren } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitFork, Home, ShieldCheck, Star } from "lucide-react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";

const pages = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: <Home />,
  },
  {
    path: "/nominate",
    label: "Nominate",
    icon: <Star />,
  },
  {
    path: "/pools",
    label: "Pools",
    icon: <GitFork />,
  },
  {
    path: "/validators",
    label: "Validators",
    icon: <ShieldCheck />,
  },
];

export const NavMenu: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const matchedPath = pages.find((page) =>
    matchPath(page.path, location.pathname)
  );

  return (
    <Tabs
      value={matchedPath?.path}
      onValueChange={navigate}
      className="p-2 pt-4"
    >
      <TabsList>
        {pages.map((page) => (
          <TabsTrigger key={page.path} value={page.path}>
            {page.icon} {page.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="dashboard">{children}</TabsContent>
    </Tabs>
  );
};
