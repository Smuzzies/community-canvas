import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useThor } from "@vechain/vechain-kit"
import { CONTRACT_ADDRESS, CANVAS_SIZE, uint24ToHex } from "@/lib/contract"
import type { Pixel } from "@/lib/types"

// keccak256("Painted(uint16,uint16,uint24,address,uint32)")
// Verified against deployed contract on mainnet
const PAINTED_TOPIC = "0x6db073b5c12d206a90d252ae6e2c67f7d6450410a616e933c4658dc96093015c"

/**
 * Decode a single Painted event log into a Pixel.
 *
 * Event signature: Painted(uint16 indexed x, uint16 indexed y, uint24 color, address indexed painter, uint32 blockNumber)
 *
 * topics[0] = event sig
 * topics[1] = x (indexed uint16, padded to 32 bytes)
 * topics[2] = y (indexed uint16, padded to 32 bytes)
 * topics[3] = painter (indexed address, padded to 32 bytes)
 * data      = abi.encode(color uint24, blockNumber uint32) — each padded to 32 bytes
 */
function decodeEvent(ev: { topics: string[]; data: string }): Pixel {
  const x = parseInt(ev.topics[1]!, 16)
  const y = parseInt(ev.topics[2]!, 16)
  const painter = "0x" + ev.topics[3]!.slice(26) // last 20 bytes of 32-byte padded address

  const data = ev.data.replace("0x", "")
  const color = parseInt(data.slice(0, 64), 16)        // first 32 bytes = color uint24
  const blockNumber = parseInt(data.slice(64, 128), 16) // second 32 bytes = blockNumber uint32

  return { x, y, color: uint24ToHex(color), painter, blockNumber }
}

/** Fetch the full canvas state by reading all Painted events via ThorClient (no CORS issues) */
export function useCanvasPixels() {
  const thor = useThor()

  return useQuery({
    queryKey: ["canvas", "pixels", CONTRACT_ADDRESS],
    queryFn: async (): Promise<Pixel[]> => {
      if (!thor) return []

      // Use thor.logs.filterRawEventLogs — goes through the ThorClient HTTP client,
      // not a raw browser fetch, so it bypasses the 403 CORS issue on mainnet.vechain.org
      const logs = await thor.logs.filterRawEventLogs({
        range: { unit: "block", from: 0, to: 2 ** 32 - 1 },
        options: { offset: 0, limit: 100000 },
        criteriaSet: [{ address: CONTRACT_ADDRESS, topic0: PAINTED_TOPIC }],
        order: "asc",
      })

      // Build canvas: last event per (x,y) wins
      const pixelMap = new Map<string, Pixel>()
      for (const ev of logs ?? []) {
        const pixel = decodeEvent(ev)
        pixelMap.set(`${pixel.x},${pixel.y}`, pixel)
      }

      // Full 100x100 grid — unpainted pixels default to white
      const pixels: Pixel[] = []
      for (let x = 0; x < CANVAS_SIZE; x++) {
        for (let y = 0; y < CANVAS_SIZE; y++) {
          pixels.push(
            pixelMap.get(`${x},${y}`) ?? {
              x, y,
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
    placeholderData: keepPreviousData,
  })
}
