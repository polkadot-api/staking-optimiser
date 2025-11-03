import {
  useEffect,
  useState,
  type ComponentType,
  type FC,
  type JSX,
} from "react"

export const codeSplit = <Payload, Props>(
  promise: Promise<Payload>,
  NotReady: ComponentType<Props>,
  Ready: ComponentType<
    Props & {
      payload: Payload
    }
  >,
): FC<Props> => {
  let loadedPayload: Payload | null = null
  const loadedPromise = promise.then((payload) => {
    loadedPayload = payload
    return payload
  })

  const usePayload = () => {
    const [module, setModule] = useState(loadedPayload)

    useEffect(() => {
      if (module === null) {
        loadedPromise.then(setModule)
      }
    }, [module])

    return module
  }

  return (props) => {
    const payload = usePayload()

    if (payload === null) {
      return <NotReady {...(props as Props & JSX.IntrinsicAttributes)} />
    }
    return <Ready {...props} payload={payload} />
  }
}
