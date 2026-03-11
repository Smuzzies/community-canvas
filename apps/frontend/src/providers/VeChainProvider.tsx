"use client"

import dynamic from "next/dynamic"
import { useColorMode } from "@/components/ui/color-mode"

const VeChainKitProvider = dynamic(
  () => import("@vechain/vechain-kit").then(mod => mod.VeChainKitProvider),
  { ssr: false },
)

interface Props {
  readonly children: React.ReactNode
}

export function VeChainProvider({ children }: Props) {
  const { colorMode } = useColorMode()
  const isDarkMode = colorMode === "dark"
  const networkType = (process.env.NEXT_PUBLIC_NETWORK ?? "main") as "main" | "test"
  // mainnet.vechain.org blocks browser requests with 403 (no CORS headers).
  // vethor-node.vechain.com returns access-control-allow-origin: * and is the
  // official VeChain Foundation public node with CORS support.
  const nodeUrl = process.env.NEXT_PUBLIC_NODE_URL ?? "https://node-mainnet.vechain.energy"

  return (
    <VeChainKitProvider
      dappKit={{
        allowedWallets: ["veworld", "wallet-connect", "sync2"],
        walletConnectOptions: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
          ? {
              projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
              metadata: {
                name: "Community Canvas",
                description: "Community Canvas — Paint pixels on VeChain",
                url: typeof window !== "undefined" ? window.location.origin : "",
                icons: [],
              },
            }
          : undefined,
      }}
      loginMethods={[
        { method: "vechain", gridColumn: 4 },
        { method: "dappkit", gridColumn: 4 },
      ]}
      darkMode={isDarkMode}
      language="en"
      network={{ type: networkType, nodeUrl }}>
      {children}
    </VeChainKitProvider>
  )
}
