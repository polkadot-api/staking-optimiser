import { createLocalStorageState } from "@/util/rxjs";

export const [readOnlyAddresses$, setAddresses] = createLocalStorageState(
  "read-only-addr",
  [] as string[]
);
