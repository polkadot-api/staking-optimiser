import { dot } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";

export const client = createClient(
  withLogsRecorder(
    (...v) => console.debug("relayChain", ...v),
    withPolkadotSdkCompat(getWsProvider("wss://rpc.ibp.network/polkadot"))
  )
);

export const typedApi = client.getTypedApi(dot);
