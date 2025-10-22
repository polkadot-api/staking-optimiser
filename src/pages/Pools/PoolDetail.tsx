import { AddressIdentity } from "@/components/AddressIdentity";
import { Card } from "@/components/Card";
import { Loading } from "@/components/Spinner";
import { TokenValue } from "@/components/TokenValue";
import { cn } from "@/lib/utils";
import { accountStatus$ } from "@/state/account";
import { stakingSdk$ } from "@/state/chain";
import { formatPercentage } from "@/util/format";
import { state, useStateObservable, withDefault } from "@react-rxjs/core";
import {
  ArrowLeft,
  Gauge,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Fragment,
  type FC,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import { combineLatest, map, switchMap } from "rxjs";
import { aggregatedValidators$ } from "../Validators/validatorList.state";
import { JoinPool } from "./JoinPool";

const pool$ = state((id: number) =>
  combineLatest([
    stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPool$(id))),
    aggregatedValidators$.pipe(
      map((validators) =>
        Object.fromEntries(validators?.map((v) => [v.address, v]) ?? [])
      )
    ),
  ]).pipe(
    map(([pool, validators]) => {
      if (!pool) return null;

      const nominations = pool.nominations
        .map((v) => validators[v])
        .filter((v) => v != null)
        .sort((a, b) => b.nominatorApy - a.nominatorApy);
      const apys = nominations.map((v) => v.nominatorApy);
      const commissionMul = 1 - pool.commission.current;

      return {
        ...pool,
        nominations,
        minApy: apys.length
          ? apys.reduce((a, b) => Math.min(a, b)) * commissionMul
          : 0,
        maxApy: apys.reduce((a, b) => Math.max(a, b), 0) * commissionMul,
        avgApy: apys.length
          ? (apys.reduce((a, b) => a + b) / apys.length) * commissionMul
          : 0,
      };
    })
  )
);

const isNominating$ = accountStatus$.pipeState(
  map((v) => !!v?.nomination.nominating || !!v?.nominationPool.pool),
  withDefault(true)
);

const statusConfig: Record<"Open" | "Blocked" | "Destroying", string> = {
  Open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Blocked:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Destroying: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

export const PoolDetail = () => {
  const { poolId } = useParams<{ poolId: string }>();
  const pool = useStateObservable(pool$(Number(poolId)));
  const isNominating = useStateObservable(isNominating$);

  if (!pool) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loading>Loading pool details…</Loading>
      </div>
    );
  }

  const statusBadge = statusConfig[pool.state];

  return (
    <div className="space-y-6 p-2">
      <Link to=".." className="flex items-center gap-2">
        <ArrowLeft className="size-4" /> Back to pools
      </Link>

      <header className="rounded-2xl border border-border/60 bg-background/90 p-6 shadow-sm">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground space-x-2">
            <span>Nomination pool</span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                statusBadge
              )}
            >
              {pool.state}
            </span>
          </div>
          <h1 className="text-2xl font-semibold capitalize">
            {pool.name || `Pool #${pool.id}`}
          </h1>
          <div className="text-sm">
            <span className="font-medium text-foreground">Pool </span>
            <span className="text-accent-foreground">#{pool.id}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={<Users className="size-4" />} label="Members">
            {pool.memberCount.toLocaleString()}
          </Stat>
          <Stat icon={<ShieldCheck className="size-4" />} label="Pool bond">
            <TokenValue value={pool.bond} />
          </Stat>
          <Stat icon={<Gauge className="size-4" />} label="Average APY">
            {formatPercentage(pool.avgApy)}
          </Stat>
          <Stat icon={<PieChart className="size-4" />} label="Commission">
            {formatPercentage(pool.commission.current)}
          </Stat>
          <Stat
            icon={<ShieldAlert className="size-4" />}
            label="Nominations"
            className="hidden lg:block"
          >
            {pool.nominations.length.toLocaleString()}
          </Stat>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Commission details" className="space-y-4">
            <DefinitionList
              items={[
                {
                  term: "Current commission",
                  value: formatPercentage(pool.commission.current),
                },
                pool.commission.max !== undefined
                  ? {
                      term: "Maximum commission",
                      value: formatPercentage(pool.commission.max),
                    }
                  : null,
                pool.commission.change_rate
                  ? {
                      term: "Change rate",
                      value: `${formatPercentage(
                        pool.commission.change_rate.max_increase
                      )} max / ${pool.commission.change_rate.min_delay} eras`,
                    }
                  : null,
                pool.commission.throttleFrom !== undefined
                  ? {
                      term: "Throttle era",
                      value: pool.commission.throttleFrom.toLocaleString(),
                    }
                  : null,
                pool.commission.claimPermission
                  ? ((permission) => ({
                      term: "Claim Permission",
                      value:
                        permission.type === "Permissionless" ? (
                          "Permissionless"
                        ) : (
                          <AddressIdentity addr={permission.value} />
                        ),
                    }))(pool.commission.claimPermission)
                  : null,
              ].filter((v) => v != null)}
            />
          </Card>

          <Card title="Nominated validators" className="space-y-3">
            {pool.nominations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This pool has not nominated any validators yet.
              </p>
            ) : (
              <div className="space-y-3 pr-1">
                {pool.nominations.map((validator) => (
                  <div
                    key={validator.address}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2"
                  >
                    <AddressIdentity addr={validator.address} />
                    <div>
                      <span className="text-foreground/60">APY:</span>{" "}
                      {formatPercentage(validator.nominatorApy)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          {!isNominating && pool.state === "Open" ? (
            <JoinPool poolId={Number(poolId)} />
          ) : null}
          <Card title="Pool addresses" className="space-y-4">
            <DefinitionList
              items={[
                {
                  term: "Pool",
                  value: <AddressIdentity addr={pool.addresses.pool} />,
                },
                {
                  term: "Depositor",
                  value: <AddressIdentity addr={pool.addresses.depositor} />,
                },
                pool.addresses.root
                  ? {
                      term: "Root",
                      value: <AddressIdentity addr={pool.addresses.root} />,
                    }
                  : null,
                pool.addresses.nominator
                  ? {
                      term: "Nominator",
                      value: (
                        <AddressIdentity addr={pool.addresses.nominator} />
                      ),
                    }
                  : null,
                pool.addresses.bouncer
                  ? {
                      term: "Bouncer",
                      value: <AddressIdentity addr={pool.addresses.bouncer} />,
                    }
                  : null,
                pool.addresses.commission
                  ? {
                      term: "Commission account",
                      value: (
                        <AddressIdentity addr={pool.addresses.commission} />
                      ),
                    }
                  : null,
              ].filter((v) => v != null)}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
};

export const Stat: FC<
  PropsWithChildren<{
    icon: ReactElement;
    label: string;
    className?: string;
  }>
> = ({ icon, label, children, className }) => (
  <div
    className={cn(
      "rounded-xl border border-border/60 bg-muted/30 p-4",
      className
    )}
  >
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-2 text-xl font-semibold text-foreground">{children}</div>
  </div>
);

const DefinitionList = ({
  items,
}: {
  items: Array<{
    term: string;
    value: ReactNode;
  }>;
}) => (
  <dl className="grid gap-3 text-sm">
    {items.map((item, idx) => (
      <Fragment key={`${item.term}-${idx}`}>
        <dt className="text-muted-foreground">{item.term}</dt>
        <dd className="rounded-lg border border-border/60 bg-muted/30 p-3 font-medium text-foreground">
          {item.value}
        </dd>
      </Fragment>
    ))}
  </dl>
);
