import { useSendTransaction, useWallet } from "@vechain/vechain-kit"
import { useQueryClient } from "@tanstack/react-query"
import { Interface } from "ethers"
import { CONTRACT_ADDRESS, CONTRACT_ABI, hexToUint24 } from "@/lib/contract"
import type { QueuedPixel } from "@/lib/types"

export function usePaintPixels() {
  const { account } = useWallet()
  const queryClient = useQueryClient()
  const iface = new Interface(CONTRACT_ABI as any)

  const { sendTransaction, status, txReceipt, resetStatus, isTransactionPending, error } =
    useSendTransaction({
      signerAccountAddress: account?.address ?? "",
      onTxConfirmed: () => {
        // Invalidate canvas pixels cache so it refetches
        queryClient.invalidateQueries({ queryKey: ["canvas", "pixels", CONTRACT_ADDRESS] })
      },
    })

  const paintPixels = async (pixels: QueuedPixel[]) => {
    if (pixels.length === 0) return

    // One clause per pixel (multi-clause tx on VeChain)
    const clauses = pixels.map(p => ({
      to: CONTRACT_ADDRESS,
      value: "0x0",
      data: iface.encodeFunctionData("paint", [p.x, p.y, hexToUint24(p.color)]) as `0x${string}`,
      comment: `Paint pixel (${p.x}, ${p.y}) ${p.color}`,
    }))

    await sendTransaction(clauses)
  }

  return {
    paintPixels,
    status,
    txReceipt,
    resetStatus,
    isTransactionPending,
    error,
  }
}
