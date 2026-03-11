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

    // Single clause using paintBatch — all pixels in one contract call.
    // Saves the per-clause gas overhead (16,000 gas) for every pixel beyond the first.
    const xs     = pixels.map(p => p.x)
    const ys     = pixels.map(p => p.y)
    const colors = pixels.map(p => hexToUint24(p.color))

    const clauses = [{
      to: CONTRACT_ADDRESS,
      value: "0x0",
      data: iface.encodeFunctionData("paintBatch", [xs, ys, colors]) as `0x${string}`,
      comment: `Paint ${pixels.length} pixel${pixels.length !== 1 ? "s" : ""}`,
    }]

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
