import { NavMenu } from "@/components/NavMenu/NavMenu";
import { isNominating$ } from "@/state/nominate";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { NominatingContent } from "./Nominating";
import { NotNominatingContent } from "./NotNominating";
import { CardPlaceholder } from "@/components/CardPlaceholder";

export const Nominate = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback={<NominateSkeleton />}>
        <NominateContent />
      </Subscribe>
    </div>
  );
};

const NominateContent = () => {
  const isNominating = useStateObservable(isNominating$);

  return isNominating ? <NominatingContent /> : <NotNominatingContent />;
};

const NominateSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={400} />
    <CardPlaceholder height={400} />
  </div>
);
