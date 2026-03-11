"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Box,
  Button,
  Separator,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
  Badge,
} from "@chakra-ui/react"
import { RecentPainters } from "./RecentPainters"
import { DPad } from "./DPad"
import { LuDownload, LuRefreshCw } from "react-icons/lu"
import { useWallet, TransactionModal, useTransactionModal } from "@vechain/vechain-kit"
import { useCanvasPixels } from "@/hooks/useCanvasPixels"
import { usePaintPixels } from "@/hooks/usePaintPixels"
import { PixelCanvas, type PixelCanvasHandle } from "./PixelCanvas"
import { ColorPicker } from "./ColorPicker"
import { PixelQueue } from "./PixelQueue"
import type { QueuedPixel } from "@/lib/types"
import { CANVAS_SIZE } from "@/lib/contract"

export function CanvasPanel() {
  const { connection } = useWallet()
  const isConnected = connection.isConnected

  const { data: pixels = [], isLoading, isFetching, refetch, isRefetching } = useCanvasPixels()
  const showInitialLoader = isLoading && pixels.length === 0
  const [queue, setQueue] = useState<QueuedPixel[]>([])
  const [selectedColor, setSelectedColor] = useState("#344E5B")
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null)
  const [mobileCursor, setMobileCursor] = useState<{ x: number; y: number } | null>(null)
  const [isMobile, setIsMobile] = useState(true)  // default true; effect corrects on desktop
  const canvasRef = useRef<PixelCanvasHandle>(null)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 991px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const { paintPixels, status, txReceipt, resetStatus, isTransactionPending, error } = usePaintPixels()
  const { open: openTxModal, close: closeTxModal, isOpen: isTxModalOpen } = useTransactionModal()

  const handlePixelClick = useCallback((x: number, y: number) => {
    setSelectedPixel({ x, y })
    setQueue(prev => {
      const existing = prev.findIndex(p => p.x === x && p.y === y)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { x, y, color: selectedColor }
        return next
      }
      return [...prev, { x, y, color: selectedColor }]
    })
  }, [selectedColor])

  const handleCursorMove = useCallback((x: number, y: number) => {
    setMobileCursor({ x, y })
  }, [])

  const handleDPadPaint = useCallback(() => {
    if (!mobileCursor) return
    handlePixelClick(mobileCursor.x, mobileCursor.y)
  }, [mobileCursor, handlePixelClick])

  const handleRemoveFromQueue = useCallback((x: number, y: number) => {
    setQueue(prev => prev.filter(p => !(p.x === x && p.y === y)))
  }, [])

  const handleClearQueue = useCallback(() => setQueue([]), [])
  const handleUndo       = useCallback(() => setQueue(prev => prev.slice(0, -1)), [])

  const handlePaint = useCallback(async () => {
    if (queue.length === 0) return
    openTxModal()
    try {
      await paintPixels(queue)
      setQueue([])
    } catch { /* shown in TransactionModal */ }
  }, [queue, paintPixels, openTxModal])

  const handleDownload = useCallback(() => {
    canvasRef.current?.downloadPNG()
  }, [])

  // Desktop sidebar content
  const desktopSidebar = (
    <VStack gap={4} align="stretch">
      <ColorPicker selected={selectedColor} onChange={setSelectedColor} />
      <Separator />
      {selectedPixel && (
        <Box>
          <Text fontSize="sm" color="text.subtle" mb={2}>
            Selected:{" "}
            <Text as="span" fontFamily="mono" fontWeight="semibold">
              ({selectedPixel.x}, {selectedPixel.y})
            </Text>
          </Text>
          <Button
            size="sm" variant="outline" w="full"
            onClick={() => handlePixelClick(selectedPixel.x, selectedPixel.y)}>
            Queue ({selectedPixel.x}, {selectedPixel.y}) with{" "}
            <Box as="span" display="inline-block" w={3} h={3}
              bg={selectedColor} border="1px solid currentColor"
              borderRadius="2px" mx={1} />{" "}
            {selectedColor.toUpperCase()}
          </Button>
        </Box>
      )}
      <Separator />
      <PixelQueue
        queue={queue}
        onRemove={handleRemoveFromQueue}
        onClear={handleClearQueue}
        onUndo={handleUndo}
        onPaint={handlePaint}
        isPainting={isTransactionPending}
        isConnected={isConnected}
      />
      <Box pt={2}>
        <Text fontSize="xs" color="text.subtle">
          Click any pixel to queue it. Choose a color, then write all queued pixels to VeChain in one transaction.
        </Text>
      </Box>
    </VStack>
  )

  return (
    <VStack gap={6} align="stretch">

      {/* ── Mobile controls (above canvas) — hidden on desktop ── */}
      <Box display={{ base: "block", lg: "none" }}>
        <VStack gap={3} align="stretch">
          {/* Row 1: color swatches + D-pad side by side */}
          <Flex gap={4} align="center" justify="space-between">
            <Box flex={1}>
              <ColorPicker selected={selectedColor} onChange={setSelectedColor} compact />
            </Box>
            <DPad
              cursor={mobileCursor}
              onMove={handleCursorMove}
              onPaint={handleDPadPaint}
            />
          </Flex>

          {/* Row 2: hint or cursor coords + queue button */}
          <Flex align="center" justify="space-between" gap={2}>
            {mobileCursor ? (
              <Text fontSize="xs" color="text.subtle" fontFamily="mono">
                Cursor: ({mobileCursor.x}, {mobileCursor.y})
              </Text>
            ) : (
              <Text fontSize="xs" color="blue.400">
                Tap the canvas below to place the crosshair
              </Text>
            )}
            {queue.length > 0 && (
              <Badge colorPalette="blue" flexShrink={0}>{queue.length} queued</Badge>
            )}
          </Flex>

          {/* Row 3: submit + undo/clear */}
          {queue.length > 0 && (
            <VStack gap={2} align="stretch">
              <Button
                colorPalette="blue" size="sm" w="full"
                onClick={handlePaint}
                disabled={!isConnected || isTransactionPending}
                loading={isTransactionPending}
                loadingText="Signing...">
                {!isConnected
                  ? "Connect Wallet to Paint"
                  : `Write ${queue.length} Pixel${queue.length !== 1 ? "s" : ""} to Chain`}
              </Button>
              <HStack gap={2} justify="flex-end">
                <Button size="xs" variant="ghost" onClick={handleUndo} disabled={isTransactionPending}>
                  Undo
                </Button>
                <Button size="xs" variant="ghost" colorPalette="red" onClick={handleClearQueue} disabled={isTransactionPending}>
                  Clear all
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>

        <Separator mt={3} />
      </Box>

      {/* ── Main row: canvas + desktop sidebar ── */}
      <Flex gap={6} direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "start" }}>

        {/* Canvas column */}
        <VStack gap={3} align="center" flex="0 0 auto" w={{ base: "full", lg: `${CANVAS_SIZE * 6}px` }}>
          {/* Toolbar */}
          <Flex w="full" justify="space-between" align="center">
            <HStack gap={2}>
              <Text fontWeight="bold" fontSize="sm">Community Canvas</Text>
              <Badge colorPalette="green" size="sm">Mainnet</Badge>
            </HStack>
            <HStack gap={1}>
              <Button size="xs" variant="ghost" onClick={() => refetch()} disabled={isRefetching} aria-label="Refresh">
                <LuRefreshCw style={{ opacity: isRefetching ? 0.5 : 1 }} />
              </Button>
              <Button size="xs" variant="ghost" onClick={handleDownload} aria-label="Download PNG">
                <LuDownload />
              </Button>
            </HStack>
          </Flex>

          {/* Canvas */}
          <Box position="relative" w="full">
            <PixelCanvas
              ref={canvasRef}
              pixels={pixels}
              queue={queue}
              onPixelClick={handlePixelClick}
              cursorPixel={isMobile ? mobileCursor : null}
              mobileCursorMode={isMobile}
              onCursorMove={handleCursorMove}
            />
            {showInitialLoader && (
              <Flex position="absolute" inset={0} align="center" justify="center" bg="rgba(255,255,255,0.92)" zIndex={10}>
                <VStack gap={3}>
                  <Spinner size="lg" />
                  <Text fontSize="sm" color="text.subtle">Loading canvas from chain...</Text>
                </VStack>
              </Flex>
            )}
            {isFetching && !showInitialLoader && (
              <Box position="absolute" top={2} right={2} w={2} h={2} borderRadius="full" bg="blue.400" opacity={0.7} title="Syncing..." />
            )}
          </Box>
        </VStack>

        {/* Desktop sidebar */}
        <Box display={{ base: "none", lg: "block" }} flex={1} minW="280px" maxW="340px">
          {desktopSidebar}
        </Box>
      </Flex>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => { closeTxModal(); resetStatus() }}
        onTryAgain={() => { resetStatus(); handlePaint() }}
        status={status}
        txReceipt={txReceipt}
        txError={error}
        uiConfig={{
          title: "Paint Pixels",
          description: `Writing ${queue.length} pixel${queue.length !== 1 ? "s" : ""} to the Community Canvas`,
          showShareOnSocials: false,
          showExplorerButton: true,
        }}
      />

      {/* Recent Painters */}
      <Box w="full">
        <Separator mb={4} />
        <RecentPainters pixels={pixels} isLoading={isLoading} />
      </Box>
    </VStack>
  )
}
