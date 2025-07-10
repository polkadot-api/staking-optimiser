import { dot, polkadot_people } from "@polkadot-api/descriptors";
import { createIdentitySdk } from "@polkadot-api/sdk-accounts";
import { createStakingSdk } from "@polkadot-api/sdk-staking";
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

export const stakingSdk = createStakingSdk(typedApi, {
  maxActiveNominators: 100,
});

export const pepopleClient = createClient(
  withLogsRecorder(
    (...v) => console.debug("people", ...v),
    withPolkadotSdkCompat(
      getWsProvider("wss://sys.ibp.network/people-polkadot")
    )
  )
);
export const peopleTypedApi = pepopleClient.getTypedApi(polkadot_people);
export const identitySdk = createIdentitySdk(peopleTypedApi);
