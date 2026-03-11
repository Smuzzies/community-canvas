"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { CANVAS_SIZE, shortAddress } from "@/lib/contract"
import type { Pixel, QueuedPixel } from "@/lib/types"

const PIXEL_SIZE = 6          // px per pixel cell — 600×600 internal canvas
const CANVAS_PX = CANVAS_SIZE * PIXEL_SIZE  // 600

// Magnifier config
const MAG_RADIUS = 4           // pixels around cursor to show (4 → 9×9 region)
const MAG_CELL = 12            // how large each magnified cell appears (px)
const MAG_SIZE = (MAG_RADIUS * 2 + 1) * MAG_CELL  // total magnifier canvas size

// Pinch-to-zoom limits
const MIN_SCALE = 1
const MAX_SCALE = 8

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
  const wrapperRef       = useRef<HTMLDivElement>(null)

  // Track drawn state for diff-rendering
  const drawnPixels   = useRef<Map<string, string>>(new Map())
  const rafRef        = useRef<number | null>(null)
  const pendingBase   = useRef<Pixel[] | null>(null)
  const isInitialized = useRef(false)

  // O(1) lookups
  const pixelMap = useRef<Map<string, Pixel>>(new Map())
  const queueMap = useRef<Map<string, QueuedPixel>>(new Map())

  // Pan & zoom state (applied via CSS transform on the wrapper div)
  const scale     = useRef(1)
  const panX      = useRef(0)
  const panY      = useRef(0)

  // Touch gesture state
  const lastTouchDist  = useRef<number | null>(null)
  const lastTouchMid   = useRef<{ x: number; y: number } | null>(null)
  const isPanning      = useRef(false)
  const panStartTouch  = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  // Magnifier visibility
  const [magVisible, setMagVisible] = useState(false)
  const [magPos, setMagPos]         = useState({ top: 0, right: 0 })

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, pixel: null, screenX: 0, screenY: 0,
  })

  // ─── Drawing helpers ────────────────────────────────────────────────────────

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

  /** Draw the magnifier canvas centered on (pixelX, pixelY) */
  const drawMagnifier = useCallback((pixelX: number, pixelY: number) => {
    const mag  = magCanvasRef.current
    const base = baseCanvasRef.current
    const ov   = overlayCanvasRef.current
    if (!mag || !base || !ov) return
    const ctx = mag.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE)
    ctx.imageSmoothingEnabled = false

    for (let dy = -MAG_RADIUS; dy <= MAG_RADIUS; dy++) {
      for (let dx = -MAG_RADIUS; dx <= MAG_RADIUS; dx++) {
        const sx = pixelX + dx
        const sy = pixelY + dy
        if (sx < 0 || sy < 0 || sx >= CANVAS_SIZE || sy >= CANVAS_SIZE) {
          // Out of bounds — draw a subtle grey
          ctx.fillStyle = "rgba(180,180,180,0.4)"
          ctx.fillRect((dx + MAG_RADIUS) * MAG_CELL, (dy + MAG_RADIUS) * MAG_CELL, MAG_CELL, MAG_CELL)
          continue
        }
        // Use queued color if present, else committed
        const queued = queueMap.current.get(`${sx},${sy}`)
        const color  = queued ? queued.color : (drawnPixels.current.get(`${sx},${sy}`) ?? "#FFFFFF")
        ctx.fillStyle = color
        ctx.fillRect((dx + MAG_RADIUS) * MAG_CELL, (dy + MAG_RADIUS) * MAG_CELL, MAG_CELL, MAG_CELL)
      }
    }

    // Grid lines
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

  // ─── Effects ────────────────────────────────────────────────────────────────

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

  // ─── Coordinate helpers ──────────────────────────────────────────────────────

  /** Convert a clientX/clientY into canvas pixel coordinates, accounting for CSS scale + pan */
  const clientToPixel = useCallback((clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    // rect is the bounding box of the transformed element as seen on screen
    // We need to map screen coords back through the CSS transform
    const cssW  = CANVAS_PX  // wrapper's natural (pre-transform) width
    const cssH  = CANVAS_PX
    const scaleX = cssW  / rect.width
    const scaleY = cssH  / rect.height
    const localX = (clientX - rect.left) * scaleX
    const localY = (clientY - rect.top)  * scaleY
    const px = Math.floor(localX / PIXEL_SIZE)
    const py = Math.floor(localY / PIXEL_SIZE)
    if (px < 0 || px >= CANVAS_SIZE || py < 0 || py >= CANVAS_SIZE) return null
    return { pixelX: px, pixelY: py }
  }, [])

  // ─── Pan / Zoom helpers ──────────────────────────────────────────────────────

  const applyTransform = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    wrapper.style.transform = `scale(${scale.current}) translate(${panX.current}px, ${panY.current}px)`
    wrapper.style.transformOrigin = "top left"
  }, [])

  const clampPan = useCallback(() => {
    const s = scale.current
    if (s <= 1) { panX.current = 0; panY.current = 0; return }
    // Outer container size ≈ CANVAS_PX (it's constrained by CSS max-width)
    const maxPanX = (CANVAS_PX * (s - 1)) / (2 * s)
    const maxPanY = (CANVAS_PX * (s - 1)) / (2 * s)
    panX.current = Math.max(-maxPanX, Math.min(maxPanX, panX.current))
    panY.current = Math.max(-maxPanY, Math.min(maxPanY, panY.current))
  }, [])

  // ─── Mouse events (desktop) ──────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = clientToPixel(e.clientX, e.clientY)
    if (!coords) {
      setTooltip(t => ({ ...t, visible: false }))
      setMagVisible(false)
      return
    }
    const { pixelX, pixelY } = coords
    const queued    = queueMap.current.get(`${pixelX},${pixelY}`)
    const committed = pixelMap.current.get(`${pixelX},${pixelY}`) ?? null
    const display: Pixel | null = queued
      ? { ...(committed ?? { x: pixelX, y: pixelY, painter: "", blockNumber: 0 }), color: queued.color }
      : committed

    setTooltip({ visible: true, x: pixelX, y: pixelY, pixel: display, screenX: e.clientX, screenY: e.clientY })
    setMagVisible(true)
    drawMagnifier(pixelX, pixelY)

    // Position magnifier in top-right corner of the wrapper
    const wrapper = wrapperRef.current
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect()
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

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    scale.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.current * delta))
    clampPan()
    applyTransform()
  }, [clampPan, applyTransform])

  // ─── Touch events (mobile) ───────────────────────────────────────────────────

  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

  const getTouchMid = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = getTouchDist(e.touches[0]!, e.touches[1]!)
      lastTouchMid.current  = getTouchMid(e.touches[0]!, e.touches[1]!)
      isPanning.current = false
    } else if (e.touches.length === 1) {
      isPanning.current = true
      panStartTouch.current = {
        x: e.touches[0]!.clientX,
        y: e.touches[0]!.clientY,
        panX: panX.current,
        panY: panY.current,
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0]!, e.touches[1]!)
      if (lastTouchDist.current !== null) {
        const delta = dist / lastTouchDist.current
        scale.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.current * delta))
      }
      lastTouchDist.current = dist

      // Pan from midpoint change
      const mid = getTouchMid(e.touches[0]!, e.touches[1]!)
      if (lastTouchMid.current) {
        panX.current += (mid.x - lastTouchMid.current.x) / scale.current
        panY.current += (mid.y - lastTouchMid.current.y) / scale.current
      }
      lastTouchMid.current = mid

      clampPan()
      applyTransform()
    } else if (e.touches.length === 1 && isPanning.current && panStartTouch.current && scale.current > 1) {
      const dx = (e.touches[0]!.clientX - panStartTouch.current.x) / scale.current
      const dy = (e.touches[0]!.clientY - panStartTouch.current.y) / scale.current
      panX.current = panStartTouch.current.panX + dx
      panY.current = panStartTouch.current.panY + dy
      clampPan()
      applyTransform()
    }
  }, [clampPan, applyTransform])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      lastTouchDist.current = null
      lastTouchMid.current  = null
    }
    // Single tap → pixel click (only when not panning)
    if (e.changedTouches.length === 1 && e.touches.length === 0 && scale.current <= 1.05) {
      const touch  = e.changedTouches[0]!
      const coords = clientToPixel(touch.clientX, touch.clientY)
      if (coords) onPixelClick(coords.pixelX, coords.pixelY)
    }
    if (e.touches.length === 0) isPanning.current = false
  }, [clientToPixel, onPixelClick])

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Outer container: constrains canvas to viewport width on mobile */}
      <Box
        position="relative"
        w="full"
        maxW={`${CANVAS_PX}px`}
        lineHeight={0}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none", overflow: "hidden" }}
        userSelect="none"
      >
        {/* Inner wrapper: receives CSS scale+pan transform */}
        <Box
          ref={wrapperRef}
          position="relative"
          display="inline-block"
          lineHeight={0}
          w={`${CANVAS_PX}px`}
          h={`${CANVAS_PX}px`}
          style={{ willChange: "transform" }}
        >
          {/* Base layer */}
          <canvas
            ref={baseCanvasRef}
            width={CANVAS_PX}
            height={CANVAS_PX}
            style={{
              display: "block",
              width: CANVAS_PX,
              height: CANVAS_PX,
              imageRendering: "pixelated",
              border: "1px solid var(--app-colors-border-primary)",
            }}
          />
          {/* Overlay layer: queued pixels + mouse events */}
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_PX}
            height={CANVAS_PX}
            style={{
              position: "absolute", top: 0, left: 0,
              width: CANVAS_PX, height: CANVAS_PX,
              imageRendering: "pixelated",
              cursor: "crosshair",
            }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </Box>

        {/* Tooltip (desktop hover) */}
        {tooltip.visible && tooltip.pixel && (
          <Box
            position="fixed"
            left={tooltip.screenX + 14}
            top={tooltip.screenY - 10}
            bg="gray.900"
            color="white"
            px={3} py={2}
            borderRadius="md"
            fontSize="xs"
            pointerEvents="none"
            zIndex={1000}
            boxShadow="lg"
            minW="140px"
          >
            <Text fontWeight="bold">({tooltip.x}, {tooltip.y})</Text>
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Box w={3} h={3} borderRadius="sm" bg={tooltip.pixel.color} border="1px solid rgba(255,255,255,0.3)" flexShrink={0} />
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

      {/* Magnifier — fixed position, top-right of canvas, desktop only */}
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
