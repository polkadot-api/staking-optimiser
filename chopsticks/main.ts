import { spawn } from "child_process"
import { createWriteStream } from "fs"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const ENDPOINT = process.argv.includes("paseo")
  ? "wss://asset-hub-paseo-rpc.dwellir.com"
  : "wss://asset-hub-polkadot-rpc.dwellir.com"
const LOCAL_RPC_PORT = 8132

const logStream = createWriteStream("./chopsticks.log")
const logStreamErr = createWriteStream("./chopsticks_err.log")
const chopsticksProcess = spawn("pnpm", [
  "chopsticks",
  `--endpoint=${ENDPOINT}`,
  `--port=${LOCAL_RPC_PORT}`,
  `--db=chopsticks.db`,
  `--mock-signature-host`,
])
chopsticksProcess.stdout.pipe(logStream)
chopsticksProcess.stderr.pipe(logStreamErr)

console.log(
  "Connecting to chopsticks… It might take a few retries until the chain is up",
)
const client = createClient(getWsProvider(`ws://localhost:${LOCAL_RPC_PORT}`))
const api = client.getUnsafeApi()
await api.runtimeToken

const start = Date.now()
const gt = () => Date.now() - start

console.log("Producing initial block", gt())
await client._request("dev_newBlock", [])

console.log("Ready", gt())

client.destroy()

/**

chopsticks/node_modules/.pnpm/@polkadot+rpc-provider@16.4.9/node_modules/@polkadot/rpc-provider/cjs/ws/index.js

    send(method, params, isCacheable, subscription) {
        this.#endpointStats.requests++;
        this.#stats.total.requests++;
        const [id, body] = this.#coder.encodeJson(method, params);
        console.log([">>", new Date().toISOString(), body].join(" "));

    #onSocketMessage = (message) => {
        console.log(["<<", new Date().toISOString(), message.data].join(" "));
        l.debug(() => ['received', message.data]);
        const bytesRecv = message.data.length;
        this.#endpointStats.bytesRecv += bytesRecv;
        this.#stats.total.bytesRecv += bytesRecv;

 */
