import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { useEffect } from "react";
import { useLocation, type Location } from "react-router-dom";

// Really sad, but RRv6+ only offers subscriptions to location with a useEffect
const [locationChange$, setLocation] = createSignal<Location>();
export const location$ = state(locationChange$);
location$.subscribe();

export const useLocationSubscription = () => {
  const location = useLocation();

  useEffect(() => setLocation(location), [location]);
};
