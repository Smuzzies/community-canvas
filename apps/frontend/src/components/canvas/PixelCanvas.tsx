"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { CANVAS_SIZE, shortAddress } from "@/lib/contract"
import type { Pixel, QueuedPixel } from "@/lib/types"

const PIXEL_SIZE = 6 // px per pixel cell at 1x zoom (600x600 canvas total)

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    pixel: null,
    screenX: 0,
    screenY: 0,
  })

  // Build lookup map for O(1) pixel access
  const pixelMap = useRef<Map<string, Pixel>>(new Map())
  const queueMap = useRef<Map<string, QueuedPixel>>(new Map())

  useEffect(() => {
    const map = new Map<string, Pixel>()
    for (const p of pixels) map.set(`${p.x},${p.y}`, p)
    pixelMap.current = map
  }, [pixels])

  useEffect(() => {
    const map = new Map<string, QueuedPixel>()
    for (const q of queue) map.set(`${q.x},${q.y}`, q)
    queueMap.current = map
  }, [queue])

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = CANVAS_SIZE * PIXEL_SIZE

    // White background
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, size, size)

    // Draw committed pixels
    for (const pixel of pixels) {
      const queued = queueMap.current.get(`${pixel.x},${pixel.y}`)
      ctx.fillStyle = queued ? queued.color : pixel.color
      ctx.fillRect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    }

    // Draw queued pixels on top (with a slight highlight border)
    for (const q of queue) {
      ctx.fillStyle = q.color
      ctx.fillRect(q.x * PIXEL_SIZE, q.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      ctx.strokeStyle = "rgba(255,255,255,0.8)"
      ctx.lineWidth = 1
      ctx.strokeRect(q.x * PIXEL_SIZE + 0.5, q.y * PIXEL_SIZE + 0.5, PIXEL_SIZE - 1, PIXEL_SIZE - 1)
    }

    // Draw subtle grid lines for pixels (only when zoomed in enough)
    if (PIXEL_SIZE >= 6) {
      ctx.strokeStyle = "rgba(0,0,0,0.06)"
      ctx.lineWidth = 0.5
      for (let i = 0; i <= CANVAS_SIZE; i++) {
        ctx.beginPath()
        ctx.moveTo(i * PIXEL_SIZE, 0)
        ctx.lineTo(i * PIXEL_SIZE, size)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * PIXEL_SIZE)
        ctx.lineTo(size, i * PIXEL_SIZE)
        ctx.stroke()
      }
    }
  }, [pixels, queue])

  useEffect(() => {
    draw()
  }, [draw])

  const getPixelCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY
    const pixelX = Math.floor(canvasX / PIXEL_SIZE)
    const pixelY = Math.floor(canvasY / PIXEL_SIZE)
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
      const pixel = pixelMap.current.get(`${coords.pixelX},${coords.pixelY}`) ?? null
      setTooltip({
        visible: true,
        x: coords.pixelX,
        y: coords.pixelY,
        pixel,
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
    <Box position="relative" ref={containerRef} display="inline-block">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          cursor: "crosshair",
          display: "block",
          border: "1px solid",
          borderColor: "var(--app-colors-border-primary)",
          maxWidth: "100%",
          imageRendering: "pixelated",
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {tooltip.visible && tooltip.pixel && (
        <Box
          position="fixed"
          left={tooltip.screenX + 12}
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
          <Text fontWeight="bold">
            ({tooltip.x}, {tooltip.y})
          </Text>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Box
              w={3}
              h={3}
              borderRadius="sm"
              bg={tooltip.pixel.color}
              border="1px solid rgba(255,255,255,0.3)"
              flexShrink={0}
            />
            <Text opacity={0.8}>{tooltip.pixel.color}</Text>
          </Box>
          {tooltip.pixel.blockNumber > 0 && (
            <Text opacity={0.6} mt={1}>
              by {shortAddress(tooltip.pixel.painter)}
            </Text>
          )}
          {tooltip.pixel.blockNumber === 0 && (
            <Text opacity={0.4} mt={1}>
              unpainted
            </Text>
          )}
        </Box>
      )}
    </Box>
  )
}
