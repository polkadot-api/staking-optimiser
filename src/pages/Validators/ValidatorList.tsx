import { CardPlaceholder } from "@/components/CardPlaceholder"
import { ContractableText, createSortByButton } from "@/components/SortBy"
import { cn } from "@/lib/utils"
import { useStateObservable } from "@react-rxjs/core"
import { Pin } from "lucide-react"
import type { SS58String } from "polkadot-api"
import {
  Suspense,
  useMemo,
  useState,
  type FC,
  type SetStateAction,
} from "react"
import { useMediaQuery } from "react-responsive"
import { TableVirtuoso, Virtuoso, type ItemProps } from "react-virtuoso"
import { maParamsSub$, Params, SortBy } from "./Params"
import {
  ValidatorCard,
  ValidatorCardSkeleton,
  ValidatorRow,
  ValidatorRowSkeleton,
} from "./Validator"
import {
  percentLoaded$,
  setSortBy,
  sortBy$,
  sortedValidators$,
  validatorPrefs$,
  type HistoricValidator,
  type PositionValidator,
} from "./validatorList.state"
import { LoadingTable } from "@/components/LoadingTable"

const SortByButton = createSortByButton(sortBy$, setSortBy)

export default function ValidatorList() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ParamsSkeleton />}>
        <Params />
      </Suspense>
      <Suspense fallback={<CardPlaceholder height={500} />}>
        <ValidatorsDisplay />
      </Suspense>
    </div>
  )
}

export const validatorList$ = maParamsSub$

const ParamsSkeleton = () => (
  <div className="space-y-4 pb-2 md:space-y-0 md:flex gap-2 justify-stretch">
    <CardPlaceholder height={170} />
    <CardPlaceholder height={170} />
  </div>
)

const emptyList: Array<null> = Array(1000).fill(null)

const ValidatorsDisplay = () => {
  const supportsTable = useMediaQuery({
    query: "(min-width: 768px)",
  })

  const [selection, setSelection] = useState<SS58String[]>([])
  const validators = useStateObservable(sortedValidators$)
  const percentLoaded = useStateObservable(percentLoaded$)

  const sortedValidators = useMemo(() => {
    return validators.map(
      (v, i): PositionValidator => ({
        ...v,
        position: v.position ?? i,
        selected: selection.includes(v.address),
      }),
    )
  }, [selection, validators])

  const selectedList = selection.length
    ? sortedValidators.filter((v) => selection.includes(v.address))
    : []

  const actualValidators = sortedValidators.length
    ? sortedValidators
    : emptyList
  return (
    <LoadingTable progress={percentLoaded}>
      {supportsTable ? (
        <>
          {selectedList.length ? (
            <ValidatorTable
              validators={selectedList}
              setSelection={setSelection}
              className="mb-4"
            />
          ) : null}
          <ValidatorTable
            validators={actualValidators}
            setSelection={setSelection}
          />
        </>
      ) : (
        <ValidatorCards validators={actualValidators} />
      )}
    </LoadingTable>
  )
}

const TableRow: FC<
  ItemProps<(HistoricValidator & { selected: boolean }) | null>
> = ({ item: validator, ...props }) => {
  const prefs = useStateObservable(validatorPrefs$)
  const vPrefs = validator && prefs[validator.address]

  const idx = props["data-index"]

  return (
    <>
      <tr
        {...props}
        className={cn({
          "bg-muted": idx % 2 === 0,
          "bg-destructive/5": validator && (!vPrefs || vPrefs.blocked),
          "bg-destructive/10":
            validator && (!vPrefs || vPrefs.blocked) && idx % 2 === 0,
          "bg-neutral/5": validator?.selected,
          "bg-neutral/10": validator?.selected && idx % 2 === 0,
        })}
      >
        {props.children}
      </tr>
    </>
  )
}

const ValidatorTable: FC<{
  validators: PositionValidator[] | Array<null>
  setSelection: (value: SetStateAction<SS58String[]>) => void
  className?: string
}> = ({ validators, setSelection, className }) => {
  return (
    <TableVirtuoso
      className={cn("data-table", className)}
      customScrollParent={document.getElementById("app-content")!}
      data={validators}
      components={{ TableRow }}
      fixedHeaderContent={() => (
        <tr className="bg-background">
          <th></th>
          <th className="w-52 lg:w-60">
            <SortByButton prop="address">Validator</SortByButton>
          </th>
          <th>
            <SortByButton prop="nominatorApy">
              <ContractableText smol="Nom. APY">Nominator APY</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="totalApy">
              <ContractableText smol="Val. APY">Validator APY</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="commission">
              <ContractableText smol="Comm.">Commission</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="active">Active</SortByButton>
          </th>
          <th>
            <SortByButton prop="nominatorQuantity">
              <ContractableText smol="# Nom.">Nominators</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="points">Points</SortByButton>
          </th>
          <th className="hidden xl:table-cell">
            <SortByButton prop="activeBond">Active bond</SortByButton>
          </th>
          <th></th>
        </tr>
      )}
      itemContent={(idx, v) =>
        v ? (
          <ValidatorRow
            validator={v}
            onSelectChange={(c) =>
              setSelection((p) =>
                c ? [...p, v.address] : p.filter((addr) => addr != v.address),
              )
            }
            selectIcon={(selected) => (
              <Pin
                className={cn({
                  "text-neutral": selected,
                  "text-muted-foreground": !selected,
                })}
              />
            )}
          />
        ) : (
          <ValidatorRowSkeleton isWhite={idx % 2 === 0} />
        )
      }
    />
  )
}

const Item = (props: ItemProps<any>) => <div {...props} className="p-4" />

const ValidatorCards: FC<{
  validators: PositionValidator[] | null[]
}> = ({ validators }) => {
  return (
    <div>
      <SortBy />
      <Virtuoso
        customScrollParent={document.getElementById("app-content")!}
        totalCount={validators.length}
        components={{ Item }}
        itemContent={(idx) => {
          const v = validators[idx]
          return v ? <ValidatorCard validator={v} /> : <ValidatorCardSkeleton />
        }}
      />
    </div>
  )
}
