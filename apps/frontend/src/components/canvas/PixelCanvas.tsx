"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { useVechainDomain } from "@vechain/vechain-kit"
import { CANVAS_SIZE, shortAddress } from "@/lib/contract"
import type { Pixel, QueuedPixel } from "@/lib/types"

const PIXEL_SIZE = 6
const CANVAS_PX  = CANVAS_SIZE * PIXEL_SIZE  // 600

// Magnifier config
const MAG_RADIUS = 4                                        // cells around cursor
const MAG_CELL   = 12                                       // px per magnified cell
const MAG_SIZE   = (MAG_RADIUS * 2 + 1) * MAG_CELL         // total magnifier size

/** Tooltip component — needs its own scope to call useVechainDomain hook */
function PixelTooltip({ x, y, pixel, screenX, screenY }: {
  x: number; y: number; pixel: Pixel; screenX: number; screenY: number
}) {
  const { data: domainData } = useVechainDomain(
    pixel.blockNumber > 0 ? pixel.painter : null
  )
  const painterLabel = domainData?.domain ?? shortAddress(pixel.painter)

  return (
    <Box
      position="fixed"
      left={screenX + 14}
      top={screenY - 10}
      bg="gray.900"
      color="white"
      px={3} py={2}
      borderRadius="md"
      fontSize="xs"
      pointerEvents="none"
      zIndex={1000}
      boxShadow="lg"
      minW="150px"
    >
      <Text fontWeight="bold">({x}, {y})</Text>
      <Box display="flex" alignItems="center" gap={1} mt={2}>
        <Box w={3} h={3} borderRadius="sm" bg={pixel.color} border="1px solid rgba(255,255,255,0.3)" flexShrink={0} />
        <Text opacity={0.8}>{pixel.color.toUpperCase()}</Text>
      </Box>
      {pixel.blockNumber > 0 && (
        <Text opacity={0.6} mt={2}>by {painterLabel}</Text>
      )}
      {pixel.blockNumber === 0 && (
        <Text opacity={0.4} mt={2}>unpainted</Text>
      )}
    </Box>
  )
}

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
  const baseCanvasRef    = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const magCanvasRef     = useRef<HTMLCanvasElement>(null)
  const containerRef     = useRef<HTMLDivElement>(null)

  const drawnPixels   = useRef<Map<string, string>>(new Map())
  const rafRef        = useRef<number | null>(null)
  const pendingBase   = useRef<Pixel[] | null>(null)
  const isInitialized = useRef(false)

  const pixelMap = useRef<Map<string, Pixel>>(new Map())
  const queueMap = useRef<Map<string, QueuedPixel>>(new Map())

  const [magVisible, setMagVisible] = useState(false)
  const [magPos, setMagPos]         = useState({ top: 0, right: 0 })
  const [tooltip, setTooltip]       = useState<TooltipState>({
    visible: false, x: 0, y: 0, pixel: null, screenX: 0, screenY: 0,
  })

  // ─── Drawing ────────────────────────────────────────────────────────────────

  const drawBasePixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth = 0.5
    ctx.strokeRect(x * PIXEL_SIZE + 0.25, y * PIXEL_SIZE + 0.25, PIXEL_SIZE - 0.5, PIXEL_SIZE - 0.5)
  }, [])

  const initBase = useCallback((pixels: Pixel[]) => {
    const canvas = baseCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX)
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= CANVAS_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i * PIXEL_SIZE, 0); ctx.lineTo(i * PIXEL_SIZE, CANVAS_PX); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * PIXEL_SIZE); ctx.lineTo(CANVAS_PX, i * PIXEL_SIZE); ctx.stroke()
    }
    drawnPixels.current.clear()
    for (const p of pixels) {
      drawnPixels.current.set(`${p.x},${p.y}`, p.color)
      if (p.color !== "#FFFFFF" && p.color !== "#ffffff") {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x * PIXEL_SIZE, p.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      }
    }
  }, [])

  const updateBase = useCallback((pixels: Pixel[]) => {
    const canvas = baseCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    for (const p of pixels) {
      const key = `${p.x},${p.y}`
      if (drawnPixels.current.get(key) === p.color) continue
      drawnPixels.current.set(key, p.color)
      drawBasePixel(ctx, p.x, p.y, p.color)
    }
  }, [drawBasePixel])

  const drawOverlay = useCallback((queue: QueuedPixel[]) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX)
    for (const q of queue) {
      ctx.fillStyle = q.color
      ctx.fillRect(q.x * PIXEL_SIZE, q.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      ctx.strokeStyle = "rgba(255,255,255,0.9)"
      ctx.lineWidth = 1.5
      ctx.strokeRect(q.x * PIXEL_SIZE + 1, q.y * PIXEL_SIZE + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2)
    }
  }, [])

  const drawMagnifier = useCallback((pixelX: number, pixelY: number) => {
    const mag = magCanvasRef.current
    if (!mag) return
    const ctx = mag.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE)
    ctx.imageSmoothingEnabled = false
    for (let dy = -MAG_RADIUS; dy <= MAG_RADIUS; dy++) {
      for (let dx = -MAG_RADIUS; dx <= MAG_RADIUS; dx++) {
        const sx = pixelX + dx
        const sy = pixelY + dy
        if (sx < 0 || sy < 0 || sx >= CANVAS_SIZE || sy >= CANVAS_SIZE) {
          ctx.fillStyle = "rgba(180,180,180,0.4)"
          ctx.fillRect((dx + MAG_RADIUS) * MAG_CELL, (dy + MAG_RADIUS) * MAG_CELL, MAG_CELL, MAG_CELL)
          continue
        }
        const queued = queueMap.current.get(`${sx},${sy}`)
        const color  = queued ? queued.color : (drawnPixels.current.get(`${sx},${sy}`) ?? "#FFFFFF")
        ctx.fillStyle = color
        ctx.fillRect((dx + MAG_RADIUS) * MAG_CELL, (dy + MAG_RADIUS) * MAG_CELL, MAG_CELL, MAG_CELL)
      }
    }
    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.15)"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= MAG_RADIUS * 2 + 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * MAG_CELL, 0); ctx.lineTo(i * MAG_CELL, MAG_SIZE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * MAG_CELL); ctx.lineTo(MAG_SIZE, i * MAG_CELL); ctx.stroke()
    }
    // Crosshair on center cell
    const cx = MAG_RADIUS * MAG_CELL
    const cy = MAG_RADIUS * MAG_CELL
    ctx.strokeStyle = "rgba(255,255,255,0.9)"
    ctx.lineWidth = 2
    ctx.strokeRect(cx + 1, cy + 1, MAG_CELL - 2, MAG_CELL - 2)
    ctx.strokeStyle = "rgba(0,0,0,0.6)"
    ctx.lineWidth = 1
    ctx.strokeRect(cx + 2, cy + 2, MAG_CELL - 4, MAG_CELL - 4)
  }, [])

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const map = new Map<string, Pixel>()
    for (const p of pixels) map.set(`${p.x},${p.y}`, p)
    pixelMap.current = map
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
    const map = new Map<string, QueuedPixel>()
    for (const q of queue) map.set(`${q.x},${q.y}`, q)
    queueMap.current = map
    drawOverlay(queue)
  }, [queue, drawOverlay])

  // ─── Coordinate helper ───────────────────────────────────────────────────────

  const clientToPixel = useCallback((clientX: number, clientY: number) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return null
    const rect   = canvas.getBoundingClientRect()
    const scaleX = CANVAS_PX / rect.width
    const scaleY = CANVAS_PX / rect.height
    const px = Math.floor((clientX - rect.left) * scaleX / PIXEL_SIZE)
    const py = Math.floor((clientY - rect.top)  * scaleY / PIXEL_SIZE)
    if (px < 0 || px >= CANVAS_SIZE || py < 0 || py >= CANVAS_SIZE) return null
    return { pixelX: px, pixelY: py }
  }, [])

  // ─── Mouse events ────────────────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = clientToPixel(e.clientX, e.clientY)
    if (!coords) { setTooltip(t => ({ ...t, visible: false })); setMagVisible(false); return }
    const { pixelX, pixelY } = coords
    const queued    = queueMap.current.get(`${pixelX},${pixelY}`)
    const committed = pixelMap.current.get(`${pixelX},${pixelY}`) ?? null
    const display: Pixel | null = queued
      ? { ...(committed ?? { x: pixelX, y: pixelY, painter: "", blockNumber: 0 }), color: queued.color }
      : committed
    setTooltip({ visible: true, x: pixelX, y: pixelY, pixel: display, screenX: e.clientX, screenY: e.clientY })
    setMagVisible(true)
    drawMagnifier(pixelX, pixelY)
    // Position magnifier top-right of the canvas container
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      setMagPos({ top: rect.top + 8, right: window.innerWidth - rect.right + 8 })
    }
  }, [clientToPixel, drawMagnifier])

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
    setMagVisible(false)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = clientToPixel(e.clientX, e.clientY)
    if (!coords) return
    onPixelClick(coords.pixelX, coords.pixelY)
  }, [clientToPixel, onPixelClick])

  // ─── Touch: tap to select pixel (no zoom/pan) ────────────────────────────────

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      const touch  = e.changedTouches[0]!
      const coords = clientToPixel(touch.clientX, touch.clientY)
      if (coords) onPixelClick(coords.pixelX, coords.pixelY)
    }
  }, [clientToPixel, onPixelClick])

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Box
        ref={containerRef}
        position="relative"
        w="full"
        maxW={`${CANVAS_PX}px`}
        lineHeight={0}
        onTouchEnd={handleTouchEnd}
        userSelect="none"
      >
        {/* Base layer */}
        <canvas
          ref={baseCanvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            imageRendering: "pixelated",
            border: "1px solid var(--app-colors-border-primary)",
          }}
        />
        {/* Overlay: queued pixels + mouse/touch events */}
        <canvas
          ref={overlayCanvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            imageRendering: "pixelated",
            cursor: "crosshair",
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {tooltip.visible && tooltip.pixel && (
          <PixelTooltip
            x={tooltip.x}
            y={tooltip.y}
            pixel={tooltip.pixel}
            screenX={tooltip.screenX}
            screenY={tooltip.screenY}
          />
        )}
      </Box>

      {/* Magnifier — fixed top-right of canvas, desktop only */}
      {magVisible && (
        <Box
          position="fixed"
          top={`${magPos.top}px`}
          right={`${magPos.right}px`}
          zIndex={999}
          pointerEvents="none"
          borderRadius="md"
          overflow="hidden"
          boxShadow="0 4px 20px rgba(0,0,0,0.3)"
          border="2px solid rgba(255,255,255,0.6)"
          display={{ base: "none", md: "block" }}
        >
          <canvas
            ref={magCanvasRef}
            width={MAG_SIZE}
            height={MAG_SIZE}
            style={{ display: "block", imageRendering: "pixelated" }}
          />
        </Box>
      )}
    </>
  )
}
