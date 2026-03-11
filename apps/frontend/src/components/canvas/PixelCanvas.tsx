"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { CANVAS_SIZE, shortAddress } from "@/lib/contract"
import type { Pixel, QueuedPixel } from "@/lib/types"

const PIXEL_SIZE = 6 // px per pixel cell — 600x600 total canvas

interface Props {
  pixels: Pixel[]
  queue: QueuedPixel[]
  onPixelClick: (x: number, y: number) => void
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  pixel: Pixel | null
  screenX: number
  screenY: number
}

export function PixelCanvas({ pixels, queue, onPixelClick }: Props) {
  // Two canvas layers: base (committed pixels) + overlay (queue highlights)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // Track what we've already drawn on the base layer to diff-update
  const drawnPixels = useRef<Map<string, string>>(new Map()) // key -> color
  const rafRef = useRef<number | null>(null)
  const pendingBase = useRef<Pixel[] | null>(null)
  const pendingQueue = useRef<QueuedPixel[] | null>(null)

  // O(1) lookups
  const pixelMap = useRef<Map<string, Pixel>>(new Map())
  const queueMap = useRef<Map<string, QueuedPixel>>(new Map())

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, pixel: null, screenX: 0, screenY: 0,
  })

  // ----- Drawing helpers -----

  const drawBasePixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    // Grid line re-draw on top of the pixel
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth = 0.5
    ctx.strokeRect(x * PIXEL_SIZE + 0.25, y * PIXEL_SIZE + 0.25, PIXEL_SIZE - 0.5, PIXEL_SIZE - 0.5)
  }, [])

  /** Full base canvas init — only called once (or after a hard reset) */
  const initBase = useCallback((pixels: Pixel[]) => {
    const canvas = baseCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = CANVAS_SIZE * PIXEL_SIZE
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, size, size)

    // Draw grid first
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= CANVAS_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i * PIXEL_SIZE, 0); ctx.lineTo(i * PIXEL_SIZE, size); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * PIXEL_SIZE); ctx.lineTo(size, i * PIXEL_SIZE); ctx.stroke()
    }

    // Draw all non-white pixels
    drawnPixels.current.clear()
    for (const p of pixels) {
      drawnPixels.current.set(`${p.x},${p.y}`, p.color)
      if (p.color !== "#FFFFFF" && p.color !== "#ffffff") {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x * PIXEL_SIZE, p.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      }
    }
  }, [])

  /** Diff update — only repaint pixels that changed */
  const updateBase = useCallback((pixels: Pixel[]) => {
    const canvas = baseCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    for (const p of pixels) {
      const key = `${p.x},${p.y}`
      if (drawnPixels.current.get(key) === p.color) continue // unchanged
      drawnPixels.current.set(key, p.color)
      drawBasePixel(ctx, p.x, p.y, p.color)
    }
  }, [drawBasePixel])

  /** Redraw overlay canvas with queued pixel highlights */
  const drawOverlay = useCallback((queue: QueuedPixel[]) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const q of queue) {
      ctx.fillStyle = q.color
      ctx.fillRect(q.x * PIXEL_SIZE, q.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      // White highlight border so queued pixels are visually distinct
      ctx.strokeStyle = "rgba(255,255,255,0.9)"
      ctx.lineWidth = 1.5
      ctx.strokeRect(q.x * PIXEL_SIZE + 1, q.y * PIXEL_SIZE + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2)
    }
  }, [])

  // ----- Effects -----

  const isInitialized = useRef(false)

  useEffect(() => {
    // Update lookup maps
    const map = new Map<string, Pixel>()
    for (const p of pixels) map.set(`${p.x},${p.y}`, p)
    pixelMap.current = map

    // Schedule base canvas update via rAF to avoid mid-frame flicker
    pendingBase.current = pixels
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (!pendingBase.current) return
      if (!isInitialized.current) {
        initBase(pendingBase.current)
        isInitialized.current = true
      } else {
        updateBase(pendingBase.current)
      }
      pendingBase.current = null
    })
  }, [pixels, initBase, updateBase])

  useEffect(() => {
    // Update queue lookup map
    const map = new Map<string, QueuedPixel>()
    for (const q of queue) map.set(`${q.x},${q.y}`, q)
    queueMap.current = map

    // Overlay redraws are cheap — no rAF needed
    drawOverlay(queue)
  }, [queue, drawOverlay])

  // ----- Event handling -----

  const getPixelCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const pixelX = Math.floor(((e.clientX - rect.left) * scaleX) / PIXEL_SIZE)
    const pixelY = Math.floor(((e.clientY - rect.top) * scaleY) / PIXEL_SIZE)
    if (pixelX < 0 || pixelX >= CANVAS_SIZE || pixelY < 0 || pixelY >= CANVAS_SIZE) return null
    return { pixelX, pixelY, screenX: e.clientX, screenY: e.clientY }
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getPixelCoords(e)
      if (!coords) return
      onPixelClick(coords.pixelX, coords.pixelY)
    },
    [getPixelCoords, onPixelClick]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getPixelCoords(e)
      if (!coords) {
        setTooltip(t => ({ ...t, visible: false }))
        return
      }
      // Show queued color if pixel is queued, otherwise show committed color
      const queued = queueMap.current.get(`${coords.pixelX},${coords.pixelY}`)
      const committed = pixelMap.current.get(`${coords.pixelX},${coords.pixelY}`) ?? null
      const display: Pixel | null = queued
        ? { ...(committed ?? { x: coords.pixelX, y: coords.pixelY, painter: "", blockNumber: 0 }), color: queued.color }
        : committed
      setTooltip({
        visible: true,
        x: coords.pixelX,
        y: coords.pixelY,
        pixel: display,
        screenX: coords.screenX,
        screenY: coords.screenY,
      })
    },
    [getPixelCoords]
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const canvasSize = CANVAS_SIZE * PIXEL_SIZE

  return (
    <Box position="relative" display="inline-block" lineHeight={0}>
      {/* Base layer: committed pixels */}
      <canvas
        ref={baseCanvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          display: "block",
          width: canvasSize,
          height: canvasSize,
          imageRendering: "pixelated",
          border: "1px solid var(--app-colors-border-primary)",
        }}
      />
      {/* Overlay layer: queued pixels + mouse interaction */}
      <canvas
        ref={overlayCanvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasSize,
          height: canvasSize,
          imageRendering: "pixelated",
          cursor: "crosshair",
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {tooltip.visible && tooltip.pixel && (
        <Box
          position="fixed"
          left={tooltip.screenX + 14}
          top={tooltip.screenY - 10}
          bg="gray.900"
          color="white"
          px={3}
          py={2}
          borderRadius="md"
          fontSize="xs"
          pointerEvents="none"
          zIndex={1000}
          boxShadow="lg"
          minW="140px">
          <Text fontWeight="bold">({tooltip.x}, {tooltip.y})</Text>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Box
              w={3} h={3} borderRadius="sm"
              bg={tooltip.pixel.color}
              border="1px solid rgba(255,255,255,0.3)"
              flexShrink={0}
            />
            <Text opacity={0.8}>{tooltip.pixel.color.toUpperCase()}</Text>
          </Box>
          {tooltip.pixel.blockNumber > 0 && (
            <Text opacity={0.6} mt={1}>by {shortAddress(tooltip.pixel.painter)}</Text>
          )}
          {tooltip.pixel.blockNumber === 0 && (
            <Text opacity={0.4} mt={1}>unpainted</Text>
          )}
        </Box>
      )}
    </Box>
  )
}
