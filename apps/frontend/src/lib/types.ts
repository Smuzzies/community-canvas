export interface Pixel {
  x: number
  y: number
  color: string       // hex string "#RRGGBB"
  painter: string     // address
  blockNumber: number
}

export interface QueuedPixel {
  x: number
  y: number
  color: string       // hex string "#RRGGBB"
}
