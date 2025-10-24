import { type FC, type PropsWithChildren } from "react";
import {
  unstable_HistoryRouter as HistoryRouter,
  UNSAFE_createBrowserHistory,
} from "react-router-dom";
import { concat, defer, map, Observable, of, share } from "rxjs";

export const history = UNSAFE_createBrowserHistory({
  v5Compat: true,
});
export type HistoryUpdate = Parameters<
  Parameters<(typeof history)["listen"]>[0]
>[0];

const origListen = history.listen;

export const historyUpdate$ = new Observable<HistoryUpdate>((obs) =>
  origListen((update) => obs.next(update))
).pipe(share());

export const location$ = concat(
  defer(() => of(history.location)),
  historyUpdate$.pipe(map((v) => v.location))
);

history.listen = (listener) => {
  const sub = historyUpdate$.subscribe(listener);
  return () => sub.unsubscribe();
};

export const Router: FC<PropsWithChildren> = ({ children }) => (
  <HistoryRouter history={history}>{children}</HistoryRouter>
);
