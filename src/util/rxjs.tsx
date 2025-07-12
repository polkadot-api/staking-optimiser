import { state, Subscribe } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import type { ComponentType, JSX, ReactNode } from "react";
import { map, type Observable } from "rxjs";

export const withSubscribe =
  <T,>(
    Component: ComponentType<T>,
    subscribeProps: {
      source$?: Observable<any>;
      fallback?: NonNullable<ReactNode> | null;
    } = {}
  ) =>
  (props: JSX.IntrinsicAttributes & T) => (
    <Subscribe {...subscribeProps}>
      <Component {...props} />
    </Subscribe>
  );

export const createLocalStorageState = <T,>(
  key: string,
  defaultValue: T,
  serializer: {
    stringify: (value: Exclude<T, null>) => string;
    parse: (value: string) => T | null;
  } = JSON
) => {
  const [valueChange$, setValue] = createSignal<T | null>();
  valueChange$.subscribe((v) =>
    v === null
      ? localStorage.removeItem(key)
      : localStorage.setItem(key, serializer.stringify(v as Exclude<T, null>))
  );

  const state$ = state(
    () => valueChange$.pipe(map((v) => (v === null ? defaultValue : v))),
    () => {
      const initialValueStr = localStorage.getItem(key);
      return initialValueStr != null
        ? (serializer.parse(initialValueStr) ?? defaultValue)
        : defaultValue;
    }
  );

  return [state$(), setValue] as const;
};
