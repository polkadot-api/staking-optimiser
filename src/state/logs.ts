import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import {
  getWsProvider as _getWsProvider,
  WsEvent,
} from "polkadot-api/ws-provider";

function download(filename: string, text: string) {
  var element = document.createElement("a");
  element.style.display = "none";
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

let idx = 1;
const logs: Record<string, string[]> = {};
(globalThis as any).__logs = logs;

const logsEnabled =
  import.meta.env.DEV || localStorage.getItem("rpc-logs") === "true";
export const getGetWsProvider: (name: string) => typeof _getWsProvider = (
  name
) => {
  const dataIn: Array<string> = [];
  const dataOut: Array<string> = [];
  logs[name + "_in_" + ++idx] = dataIn;
  logs[name + "_out_" + idx] = dataOut;

  return (endpoints, config) =>
    withLogsRecorder(
      (log) => {
        if (logsEnabled) console.debug(name, log);
        dataOut.push(log);
      },
      withPolkadotSdkCompat(
        _getWsProvider(endpoints, {
          ...config,
          innerEnhancer: (x) =>
            withLogsRecorder((log) => {
              dataIn.push(log);
            }, x),
          onStatusChanged: (status) => {
            dataIn.push(
              status.type === WsEvent.CONNECTING
                ? `CONNECTING ${status.uri}`
                : status.type === WsEvent.CONNECTED
                  ? `CONNECTED ${status.uri}`
                  : status.type === WsEvent.CLOSE
                    ? `CLOSED`
                    : `ERROR`
            );
          },
        })
      )
    ) as any;
};

const downloadLogs = () => {
  Object.entries(logs).forEach(([name, x]) => {
    download(name, x.join("\n"));
  });
};

(globalThis as any).___downloadLogs = downloadLogs;
