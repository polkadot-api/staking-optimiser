import { useStateObservable, type StateObservable } from "@react-rxjs/core"
import { SortAsc, SortDesc } from "lucide-react"
import type { FC, PropsWithChildren } from "react"

export type SortBy<T> = {
  prop: keyof T
  dir: "asc" | "desc"
}

export const genericSort =
  <T,>({ prop, dir }: SortBy<T>) =>
  (a: T, b: T) => {
    const aValue = a[prop]
    const bValue: any = b[prop]
    const value = (() => {
      switch (typeof aValue) {
        case "bigint":
          return Number(aValue - bValue)
        case "number":
          return aValue - bValue
        case "string":
          return aValue.localeCompare(bValue)
        case "boolean":
          return (aValue ? 1 : 0) - (bValue ? 1 : 0)
      }
      return 0
    })()

    return dir === "asc" ? value : -value
  }

export const createSortByButton =
  <T,>(
    sortBy$: StateObservable<SortBy<T>>,
    setSortBy: (sortBy: SortBy<T>) => void,
  ): FC<
    PropsWithChildren<{
      prop: keyof T
    }>
  > =>
  ({ prop, children }) => {
    const sortBy = useStateObservable(sortBy$)

    return (
      <button
        className="flex w-full items-center justify-center gap-2"
        onClick={() => {
          if (sortBy.prop === prop) {
            setSortBy({
              ...sortBy,
              dir: sortBy.dir === "asc" ? "desc" : "asc",
            })
          } else {
            setSortBy({
              ...sortBy,
              prop,
            })
          }
        }}
      >
        {children}
        {prop === sortBy.prop ? (
          sortBy.dir === "asc" ? (
            <SortAsc size={20} />
          ) : (
            <SortDesc size={20} />
          )
        ) : null}
      </button>
    )
  }

export const ContractableText: FC<PropsWithChildren<{ smol: string }>> = ({
  smol,
  children,
}) => (
  <>
    <span className="hidden xl:inline">{children}</span>
    <span className="xl:hidden">{smol}</span>
  </>
)
