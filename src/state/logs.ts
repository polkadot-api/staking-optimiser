import type { JsonRpcProvider } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getWsProvider as _getWsProvider } from "polkadot-api/ws"

function download(filename: string, text: string) {
  var element = document.createElement("a")
  element.style.display = "none"
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text),
  )
  element.setAttribute("download", filename)
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

let idx = 1
const logs: Record<string, string[]> = {}
;(globalThis as any).__logs = logs

const logsLevel = import.meta.env.DEV
  ? localStorage.getItem("logs-console") === "true"
    ? 2
    : 1
  : 0

export const getGetWsProvider = (
  name: string,
): ((...params: Parameters<typeof _getWsProvider>) => JsonRpcProvider) => {
  if (!logsLevel)
    return (endpoints, config) => _getWsProvider(endpoints, config)

  const dataIn: Array<string> = []
  const dataOut: Array<string> = []
  logs[name + "_in_" + ++idx] = dataIn
  logs[name + "_out_" + idx] = dataOut

  return (endpoints, config) =>
    withLogsRecorder(
      (log) => {
        if (logsLevel > 1) console.debug(log)
        dataOut.push(log)
      },
      _getWsProvider(endpoints, {
        ...config,
        logger: (evt) => {
          if ("url" in evt) {
            dataIn.push(`${evt.type} ${evt.url}`)
          } else if ("msg" in evt) {
            dataIn.push(`${evt.type} ${evt.msg}`)
          } else {
            dataIn.push(`${evt.type}`)
          }
        },
      }),
    )
}

const downloadLogs = () => {
  Object.entries(logs).forEach(([name, x]) => {
    download(name, x.join("\n"))
  })
}

;(globalThis as any).___downloadLogs = downloadLogs
