import { Card } from "@/components/Card"
import { DialogButton } from "@/components/DialogButton"
import { LoadingTable } from "@/components/LoadingTable"
import { ContractableText, createSortByButton } from "@/components/SortBy"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useStateObservable } from "@react-rxjs/core"
import {
  Search,
  Shuffle,
  Sparkles,
  Square,
  SquareCheck,
  Table2,
  Trash2,
} from "lucide-react"
import { useMemo, type FC } from "react"
import { useMediaQuery } from "react-responsive"
import { TableVirtuoso, Virtuoso, type ItemProps } from "react-virtuoso"
import { map, merge } from "rxjs"
import { MaParams, maParamsSub$ } from "../../Validators/Params"
import {
  ValidatorCard,
  ValidatorCardSkeleton,
  ValidatorRow,
  ValidatorRowSkeleton,
} from "../../Validators/Validator"
import {
  percentLoaded$,
  validatorPrefs$,
  type HistoricValidator,
  type PositionValidator,
} from "../../Validators/validatorList.state"
import {
  MAX_VALIDATORS,
  search$,
  selectedValidators$,
  setSearch,
  setSortBy,
  sortBy$,
  sortedValidators$,
  toggleValidator,
  validatorsWithPreferences$,
} from "./pickValidators.state"
import { ValidatorGrid } from "./ValidatorGrid"

const SortByButton = createSortByButton(sortBy$, setSortBy)

function PickValidators() {
  const search = useStateObservable(search$)

  return (
    <>
      <div className="space-y-4 pb-2 md:space-y-0 md:flex gap-2 justify-stretch">
        <Card title="Data Options" className="basis-xl grow">
          <MaParams />
        </Card>
        <Card title="Search" className="basis-lg">
          <label className="flex items-center gap-2">
            <Search />
            <Input
              value={search}
              onChange={(evt) => setSearch(evt.target.value)}
            />
          </label>
        </Card>
      </div>
      <ValidatorsDisplay />
    </>
  )
}

export const customSquare$ = selectedValidators$.pipeState(
  map((x) => (
    <Square
      className={cn("text-muted-foreground", {
        "cursor-not-allowed": x.size >= MAX_VALIDATORS,
      })}
    />
  )),
)

export const pickValidatorsSub$ = merge(
  customSquare$,
  maParamsSub$,
  selectedValidators$,
  validatorsWithPreferences$,
  sortedValidators$,
)

export const Nominations = () => {
  const selection = useStateObservable(selectedValidators$)
  const selectionArr = Array.from(selection)
  const validators = useStateObservable(validatorsWithPreferences$)
  const sortedValidators = useStateObservable(sortedValidators$)

  const validatorByAddr = useMemo(
    () => Object.fromEntries(validators.map((v) => [v.address, v])),
    [validators],
  )

  const selectedValidators = selectionArr.map((address) => {
    const validator = validatorByAddr[address]
    return {
      address,
      apy: validator?.prefs != null ? validator.nominatorApy : 0,
    }
  })

  return (
    <ValidatorGrid
      selectedValidators={selectedValidators}
      onRemove={toggleValidator}
    >
      <div className="flex flex-wrap gap-2 justify-center">
        <DialogButton
          variant="outline"
          className="group relative overflow-hidden border-blue-200 bg-blue-50 text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900"
          title={`Pick up to 16 validators (${selection.size}/16)`}
          content={() => <PickValidators />}
          dialogClassName="md:max-w-3xl max-h-9/10 lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl h-full"
          contentClassName="flex-1 flex flex-col"
        >
          <Table2 className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
          Pick from table
        </DialogButton>
        <Button
          variant="outline"
          className="group relative overflow-hidden border-emerald-200 bg-emerald-50 text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-sm dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900"
          onClick={() => {
            const unselectedTop10 = sortedValidators
              .slice(0, Math.round(sortedValidators.length / 10))
              .filter((v) => !selection.has(v.address))
            for (let i = 0; i < MAX_VALIDATORS - selection.size; i++) {
              const [pick] = unselectedTop10.splice(
                Math.floor(Math.random() * unselectedTop10.length),
                1,
              )
              toggleValidator(pick.address)
            }
          }}
        >
          <Sparkles className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
          Fill with random top 10%
        </Button>
        <Button
          variant="outline"
          className="group relative overflow-hidden border-amber-200 bg-amber-50 text-amber-700 transition-all hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:border-amber-700 dark:hover:bg-amber-900"
          onClick={() => {
            if (selection.size === MAX_VALIDATORS) return
            const unselectedTop10 = sortedValidators
              .slice(0, Math.round(sortedValidators.length / 10))
              .filter((v) => !selection.has(v.address))
            const pick =
              unselectedTop10[
                Math.floor(Math.random() * unselectedTop10.length)
              ]
            toggleValidator(pick.address)
          }}
        >
          <Shuffle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-180" />
          Pick random top 10%
        </Button>

        <Button
          variant="outline"
          className="group relative overflow-hidden border-red-200 bg-red-50 text-red-700 transition-all hover:border-red-300 hover:bg-red-100 hover:shadow-sm dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-900"
          onClick={() => {
            for (const validator of selection) {
              toggleValidator(validator)
            }
          }}
        >
          <Trash2 className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
          Remove all
        </Button>
      </div>
    </ValidatorGrid>
  )
}

const emptyList: Array<null> = Array(1000).fill(null)
const ValidatorsDisplay = () => {
  const selection = useStateObservable(selectedValidators$)
  const validators = useStateObservable(sortedValidators$)
  const percentLoaded = useStateObservable(percentLoaded$)
  const supportsTable = useMediaQuery({
    query: "(min-width: 768px)",
  })

  const sortedValidators = useMemo(() => {
    return validators.map(
      (v, i): PositionValidator => ({
        ...v,
        position: v.position ?? i,
        selected: selection.has(v.address),
      }),
    )
  }, [selection, validators])
  const actualValidators = sortedValidators.length
    ? sortedValidators
    : emptyList

  return (
    <LoadingTable progress={percentLoaded} className="h-full">
      {supportsTable ? (
        <ValidatorTable validators={actualValidators} />
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
}> = ({ validators }) => {
  return (
    <TableVirtuoso
      className="data-table h-full"
      data={validators}
      components={{ TableRow }}
      fixedHeaderContent={() => (
        <tr className="bg-background">
          <th></th>
          <th className="w-52 lg:w-60">
            <SortByButton prop="address">Validator</SortByButton>
          </th>
          <th className="max-w-[10%]">
            <SortByButton prop="nominatorApy">
              <ContractableText smol="Nom. APY">Nominator APY</ContractableText>
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
      itemContent={(idx, v) => {
        return v ? (
          <ValidatorRow
            validator={v}
            onSelectChange={() => toggleValidator(v.address)}
            selectIcon={(selected) =>
              selected ? (
                <SquareCheck className="text-positive" />
              ) : (
                customSquare$
              )
            }
            hideValApy
          />
        ) : (
          <ValidatorRowSkeleton isWhite={idx % 2 === 0} />
        )
      }}
    />
  )
}

const Item = (props: ItemProps<any>) => <div {...props} className="p-2" />

const ValidatorCards: FC<{
  validators: PositionValidator[] | null[]
}> = ({ validators }) => (
  <Virtuoso
    className="h-full"
    totalCount={validators.length}
    components={{ Item }}
    itemContent={(idx) => {
      const v = validators[idx]
      return v ? (
        <ValidatorCard
          validator={v}
          onSelectChange={() => toggleValidator(v.address)}
          selectIcon={(selected) =>
            selected ? <SquareCheck className="text-positive" /> : customSquare$
          }
        />
      ) : (
        <ValidatorCardSkeleton />
      )
    }}
  />
)
