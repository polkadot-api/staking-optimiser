import { useEffect, useState, type ComponentType, type JSX } from "react";

export const codeSplit = <Payload, Props>(
  promise: Promise<Payload>,
  NotReady: ComponentType<Props>,
  Ready: ComponentType<
    Props & {
      payload: Payload;
    }
  >
) => {
  let loadedPayload: Payload | null = null;
  const loadedPromise = promise.then((payload) => {
    loadedPayload = payload;
    return payload;
  });

  const usePayload = () => {
    const [module, setModule] = useState(loadedPayload);

    useEffect(() => {
      if (module === null) {
        loadedPromise.then(setModule);
      }
    }, [module]);

    return module;
  };

  return (props: Props & JSX.IntrinsicAttributes) => {
    const payload = usePayload();

    if (payload === null) {
      return <NotReady {...props} />;
    }
    return <Ready {...props} payload={payload} />;
  };
};
