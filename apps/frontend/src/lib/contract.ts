/**
 * CommunityCanvas contract config.
 * Update CONTRACT_ADDRESS after deploying to mainnet.
 */

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ?? "0x0000000000000000000000000000000000000000"

export const CONTRACT_ABI = [
  {
    type: "function",
    name: "paint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "x", type: "uint16" },
      { name: "y", type: "uint16" },
      { name: "color", type: "uint24" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "paintBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "xs", type: "uint16[]" },
      { name: "ys", type: "uint16[]" },
      { name: "colors", type: "uint24[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getPixel",
    stateMutability: "view",
    inputs: [
      { name: "x", type: "uint16" },
      { name: "y", type: "uint16" },
    ],
    outputs: [
      { name: "color", type: "uint24" },
      { name: "painter", type: "address" },
      { name: "blockNumber", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "getPixels",
    stateMutability: "view",
    inputs: [
      { name: "xs", type: "uint16[]" },
      { name: "ys", type: "uint16[]" },
    ],
    outputs: [
      { name: "colors", type: "uint24[]" },
      { name: "painters", type: "address[]" },
      { name: "blockNumbers", type: "uint32[]" },
    ],
  },
  {
    type: "event",
    name: "Painted",
    inputs: [
      { name: "x", type: "uint16", indexed: true },
      { name: "y", type: "uint16", indexed: true },
      { name: "color", type: "uint24", indexed: false },
      { name: "painter", type: "address", indexed: true },
      { name: "blockNumber", type: "uint32", indexed: false },
    ],
  },
] as const

export const CANVAS_SIZE = 100

/** Convert a hex color string (#RRGGBB) to uint24 number */
export function hexToUint24(hex: string): number {
  const clean = hex.replace("#", "")
  return parseInt(clean, 16)
}

/** Convert a uint24 number to hex color string (#RRGGBB) */
export function uint24ToHex(value: number): string {
  return "#" + value.toString(16).padStart(6, "0").toUpperCase()
}

/** Shorten an address for display: 0x1234...abcd */
export function shortAddress(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—"
  return addr.slice(0, 6) + "..." + addr.slice(-4)
}
