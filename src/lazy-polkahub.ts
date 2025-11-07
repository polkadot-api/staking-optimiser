const main = import("polkahub")

export const awaitedVaultTxModal = main.then(({ VaultTxModal }) => ({ VaultTxModal }))
export const walletConnectProvider = main.then(
  ({ createWalletConnectProvider, knownChains }) =>
    createWalletConnectProvider(import.meta.env.VITE_REOWN_PROJECT_ID, [
      knownChains.polkadot,
      knownChains.polkadotAh,
      knownChains.kusama,
      knownChains.kusamaAh,
      knownChains.paseo,
      knownChains.paseoAh,
    ]),
)

export const awaitedOthers = main.then(
    ({ PolkaHubModal, SelectAccountField, ManagePjsWallets }) => ({
      PolkaHubModal,
      SelectAccountField,
      ManagePjsWallets,
    }),
  )
