import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";

const ENDPOINT = "wss://rpc.ibp.network/polkadot";
const LOCAL_RPC_PORT = 8132;

const logStream = createWriteStream("./chopsticks.log");
const logStreamErr = createWriteStream("./chopsticks_err.log");
const chopsticksProcess = spawn("pnpm", [
  "chopsticks",
  `--endpoint=${ENDPOINT}`,
  `--port=${LOCAL_RPC_PORT}`,
]);
chopsticksProcess.stdout.pipe(logStream);
chopsticksProcess.stderr.pipe(logStreamErr);

console.log(
  "Connecting to chopsticks… It might take a few retries until the chain is up"
);
const client = createClient(getWsProvider(`ws://localhost:${LOCAL_RPC_PORT}`));
await client.getUnsafeApi().runtimeToken;

console.log("Producing initial block");
await client._request("dev_newBlock", []);

console.log("Ready");

client.destroy();
