import { Card } from "@/components/Card"
import { LoadingTable } from "@/components/LoadingTable"
import { ContractableText, createSortByButton } from "@/components/SortBy"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useStateObservable } from "@react-rxjs/core"
import { Search, Square, SquareCheck } from "lucide-react"
import { useMemo, type FC } from "react"
import { useMediaQuery } from "react-responsive"
import { TableVirtuoso, Virtuoso, type ItemProps } from "react-virtuoso"
import { merge } from "rxjs"
import { MaParams, maParamsSub$, SortBy } from "../../Validators/Params"
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

export default function PickValidators() {
  const search = useStateObservable(search$)

  return (
    <div className="space-y-4">
      <Selection />
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
    </div>
  )
}

export const pickValidatorsSub$ = merge(
  maParamsSub$,
  selectedValidators$,
  validatorsWithPreferences$,
  sortedValidators$,
)

const Selection = () => {
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
        <Button
          variant="secondary"
          onClick={() => {
            const selected = new Set(selection)
            for (
              let i = 0;
              i < sortedValidators.length && selected.size < MAX_VALIDATORS;
              i++
            ) {
              const addr = sortedValidators[i].address
              if (selected.has(addr)) continue
              selected.add(addr)
              toggleValidator(addr)
            }
          }}
        >
          Fill with top
        </Button>
        <Button
          variant="secondary"
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
          Fill with random top 10%
        </Button>
        <Button
          variant="secondary"
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
          Pick random top 10%
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            for (const validator of selection) {
              toggleValidator(validator)
            }
          }}
        >
          Remove all
        </Button>
      </div>
    </ValidatorGrid>
  )
}

const emptyList: Array<null> = Array(1000).fill(null)
const ValidatorsDisplay = () => {
  const supportsTable = useMediaQuery({
    query: "(min-width: 768px)",
  })

  const selection = useStateObservable(selectedValidators$)
  const validators = useStateObservable(sortedValidators$)
  const percentLoaded = useStateObservable(percentLoaded$)

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
    <LoadingTable progress={percentLoaded}>
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
  className?: string
}> = ({ validators, className }) => {
  return (
    <TableVirtuoso
      className={cn("data-table", className)}
      customScrollParent={
        document.getElementById("dialog-content") ??
        document.getElementById("app-content")!
      }
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
                <Square className="text-muted-foreground" />
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

const Item = (props: ItemProps<any>) => <div {...props} className="p-4" />

const ValidatorCards: FC<{
  validators: PositionValidator[] | null[]
}> = ({ validators }) => {
  return (
    <div>
      <SortBy />
      <Virtuoso
        customScrollParent={
          document.getElementById("dialog-content") ??
          document.getElementById("app-content")!
        }
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
