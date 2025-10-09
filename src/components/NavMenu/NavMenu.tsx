import type { FC, PropsWithChildren } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitFork, Home, ShieldCheck, Star } from "lucide-react";
import {
  matchPath,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

const pages = [
  {
    path: "/:chain/dashboard",
    label: "Dashboard",
    icon: <Home />,
  },
  {
    path: "/:chain/nominate",
    label: "Nominate",
    icon: <Star />,
  },
  {
    path: "/:chain/pools",
    label: "Pools",
    icon: <GitFork />,
  },
  {
    path: "/:chain/validators",
    label: "Validators",
    icon: <ShieldCheck />,
  },
];

export const NavMenu: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const params = useParams<{ chain: string }>();
  const navigate = useNavigate();

  const chainPages = pages.map((v) => ({
    ...v,
    path: v.path.replace(":chain", params.chain!),
  }));
  const matchedPath = chainPages.find((page) =>
    matchPath(page.path + "/*", location.pathname)
  );

  return (
    <Tabs
      value={matchedPath?.path}
      onValueChange={navigate}
      className="p-2 pt-4"
    >
      <TabsList>
        {chainPages.map((page) => (
          <TabsTrigger key={page.path} value={page.path}>
            {page.icon} {page.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="dashboard">{children}</TabsContent>
    </Tabs>
  );
};
