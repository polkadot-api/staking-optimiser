import { NavMenu } from "@/components/NavMenu/NavMenu";
import { isNominating$ } from "@/state/nominate";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { NominatingContent } from "./Nominating";
import { NotNominatingContent } from "./NotNominating";

export const Nominate = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <NominateContent />
      </Subscribe>
    </div>
  );
};

const NominateContent = () => {
  const isNominating = useStateObservable(isNominating$);

  return isNominating ? <NominatingContent /> : <NotNominatingContent />;
};
