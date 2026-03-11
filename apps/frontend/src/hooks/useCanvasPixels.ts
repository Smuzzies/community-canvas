import { useQuery } from "@tanstack/react-query"
import { useThor } from "@vechain/vechain-kit"
import { CONTRACT_ADDRESS, CONTRACT_ABI, CANVAS_SIZE, uint24ToHex } from "@/lib/contract"
import type { Pixel } from "@/lib/types"

const PAINTED_TOPIC = "0x" + // keccak256("Painted(uint16,uint16,uint24,address,uint32)")
  // Pre-computed: matches the event signature in CommunityCanvas.sol
  "ac0c2140378851136f958deb3f6561932f50973162a62cdc254ca6a68e470eb5"

/** Fetch the full 100x100 canvas state by reading all Painted events from the chain */
export function useCanvasPixels() {
  const thor = useThor()

  return useQuery({
    queryKey: ["canvas", "pixels", CONTRACT_ADDRESS],
    queryFn: async (): Promise<Pixel[]> => {
      if (!thor) return []

      // Fetch ALL Painted events from genesis to now
      const response = await fetch(`${thor.httpClient.baseURL}/logs/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          range: { unit: "block", from: 0, to: 2 ** 32 - 1 },
          options: { offset: 0, limit: 100000 },
          criteriaSet: [{ address: CONTRACT_ADDRESS, topic0: PAINTED_TOPIC }],
          order: "asc",
        }),
      }).then(r => r.json())

      // Build canvas: last event per (x,y) wins
      const pixelMap = new Map<string, Pixel>()

      for (const ev of response ?? []) {
        // Topics: [topic0, x (indexed uint16), y (indexed uint16)]
        const x = parseInt(ev.topics[1], 16)
        const y = parseInt(ev.topics[2], 16)
        // Data: color (uint24), painter (address), blockNumber (uint32) — ABI-encoded
        const data: string = ev.data.replace("0x", "")
        const color = parseInt(data.slice(0, 64), 16)
        const painter = "0x" + data.slice(64 + 24, 64 + 64) // address is 20 bytes padded in 32
        const blockNumber = parseInt(data.slice(128, 192), 16)

        pixelMap.set(`${x},${y}`, {
          x,
          y,
          color: uint24ToHex(color),
          painter: "0x" + data.slice(88, 128), // address padded to 32 bytes
          blockNumber,
        })
      }

      // Build default white canvas, then overlay painted pixels
      const pixels: Pixel[] = []
      for (let x = 0; x < CANVAS_SIZE; x++) {
        for (let y = 0; y < CANVAS_SIZE; y++) {
          const key = `${x},${y}`
          pixels.push(
            pixelMap.get(key) ?? {
              x,
              y,
              color: "#FFFFFF",
              painter: "0x0000000000000000000000000000000000000000",
              blockNumber: 0,
            }
          )
        }
      }

      return pixels
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    enabled: !!thor,
  })
}

/** Merge new painted events (since lastBlock) into existing pixel array */
export function useCanvasUpdates(
  lastBlock: number,
  onUpdate: (updated: Pixel[]) => void
) {
  const thor = useThor()

  return useQuery({
    queryKey: ["canvas", "updates", CONTRACT_ADDRESS, lastBlock],
    queryFn: async (): Promise<Pixel[]> => {
      if (!thor || lastBlock === 0) return []

      const response = await fetch(`${thor.httpClient.baseURL}/logs/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          range: { unit: "block", from: lastBlock + 1, to: 2 ** 32 - 1 },
          options: { offset: 0, limit: 10000 },
          criteriaSet: [{ address: CONTRACT_ADDRESS, topic0: PAINTED_TOPIC }],
          order: "asc",
        }),
      }).then(r => r.json())

      const updated: Pixel[] = []
      for (const ev of response ?? []) {
        const x = parseInt(ev.topics[1], 16)
        const y = parseInt(ev.topics[2], 16)
        const data: string = ev.data.replace("0x", "")
        const color = parseInt(data.slice(0, 64), 16)
        const blockNumber = parseInt(data.slice(128, 192), 16)
        updated.push({
          x,
          y,
          color: uint24ToHex(color),
          painter: "0x" + data.slice(88, 128),
          blockNumber,
        })
      }

      if (updated.length > 0) onUpdate(updated)
      return updated
    },
    enabled: !!thor && lastBlock > 0,
    refetchInterval: 10_000,
  })
}
