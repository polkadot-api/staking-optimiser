import { Subscribe } from "@react-rxjs/core";
import type { ComponentType, JSX, ReactNode } from "react";
import type { Observable } from "rxjs";

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
