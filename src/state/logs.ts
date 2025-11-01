import { withLogsRecorder } from "polkadot-api/logs-provider";
import {
  getWsProvider as _getWsProvider,
  WsEvent,
} from "polkadot-api/ws-provider";

function download(filename: string, text: string) {
  var element = document.createElement("a");
  element.style.display = "none";
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text),
  );
  element.setAttribute("download", filename);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

let idx = 1;
const logs: Record<string, string[]> = {};
(globalThis as any).__logs = logs;

export const getGetWsProvider: (name: string) => typeof _getWsProvider = (
  name,
) => {
  const data: Array<string> = [];
  logs[name + idx] = data;
  return (endpoints, config) =>
    _getWsProvider(endpoints, {
      ...config,
      innerEnhancer: (x) =>
        withLogsRecorder((log) => {
          data.push(log);
        }, x),
      onStatusChanged: (status) => {
        data.push(
          status.type === WsEvent.CONNECTING
            ? `CONNECTING ${status.uri}`
            : status.type === WsEvent.CONNECTED
              ? `CONNECTED ${status.uri}`
              : status.type === WsEvent.CLOSE
                ? `CLOSED`
                : `ERROR`,
        );
      },
    });
};

const downloadLogs = () => {
  Object.entries(logs).forEach(([name, x]) => {
    download(name, x.join("\n"));
  });
};

(globalThis as any).___downloadLogs = downloadLogs;
