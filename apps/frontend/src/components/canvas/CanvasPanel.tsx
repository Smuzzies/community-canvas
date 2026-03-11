"use client"

import { useCallback, useState } from "react"
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
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerBackdrop,
} from "@chakra-ui/react"
import { LuDownload, LuRefreshCw, LuPalette } from "react-icons/lu"
import { useWallet, TransactionModal, useTransactionModal } from "@vechain/vechain-kit"
import { useCanvasPixels } from "@/hooks/useCanvasPixels"
import { usePaintPixels } from "@/hooks/usePaintPixels"
import { PixelCanvas } from "./PixelCanvas"
import { ColorPicker } from "./ColorPicker"
import { PixelQueue } from "./PixelQueue"
import { RecentPainters } from "./RecentPainters"
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
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const handleRemoveFromQueue = useCallback((x: number, y: number) => {
    setQueue(prev => prev.filter(p => !(p.x === x && p.y === y)))
  }, [])

  const handleClearQueue  = useCallback(() => setQueue([]), [])
  const handleUndo        = useCallback(() => setQueue(prev => prev.slice(0, -1)), [])

  const handlePaint = useCallback(async () => {
    if (queue.length === 0) return
    openTxModal()
    try {
      await paintPixels(queue)
      setQueue([])
    } catch { /* shown in TransactionModal */ }
  }, [queue, paintPixels, openTxModal])

  const handleDownload = useCallback(() => {
    const canvases = document.querySelectorAll("canvas")
    const base = canvases[0] as HTMLCanvasElement | undefined
    if (!base) return
    const composite = document.createElement("canvas")
    composite.width = base.width
    composite.height = base.height
    const ctx = composite.getContext("2d")
    if (!ctx) return
    canvases.forEach(c => { if (c !== canvases[2]) ctx.drawImage(c, 0, 0) }) // skip magnifier canvas
    composite.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = "CommunityCanvas.png"; a.click()
      URL.revokeObjectURL(url)
    })
  }, [])

  // Sidebar content — shared between desktop sidebar and mobile drawer
  const sidebarContent = (
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
            size="sm"
            variant="outline"
            w="full"
            onClick={() => handlePixelClick(selectedPixel.x, selectedPixel.y)}>
            Queue ({selectedPixel.x}, {selectedPixel.y}) with{" "}
            <Box
              as="span" display="inline-block" w={3} h={3}
              bg={selectedColor} border="1px solid currentColor"
              borderRadius="2px" mx={1}
            />{" "}
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

      <Separator />

      <RecentPainters pixels={pixels} isLoading={isLoading} />

      <Box pt={2}>
        <Text fontSize="xs" color="text.subtle">
          Click any pixel to queue it. Choose a color, then write all queued pixels to VeChain in one transaction.
        </Text>
      </Box>
    </VStack>
  )

  return (
    <Flex gap={6} direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "start" }}>

      {/* ── Canvas column ── */}
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

        {/* Canvas with loading overlay */}
        <Box position="relative" w="full">
          <PixelCanvas pixels={pixels} queue={queue} onPixelClick={handlePixelClick} />

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

        {selectedPixel && (
          <Text fontSize="xs" color="text.subtle">
            Selected: ({selectedPixel.x}, {selectedPixel.y})
          </Text>
        )}

        {/* Mobile: queue badge + open drawer button */}
        <Box display={{ base: "flex", lg: "none" }} w="full">
          <Button
            w="full"
            colorPalette="blue"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
          >
            <LuPalette />
            Paint Controls
            {queue.length > 0 && (
              <Badge colorPalette="blue" ml={2}>{queue.length}</Badge>
            )}
          </Button>
        </Box>
      </VStack>

      {/* ── Desktop sidebar ── */}
      <Box
        display={{ base: "none", lg: "block" }}
        flex={1}
        minW="280px"
        maxW="340px"
      >
        {sidebarContent}
      </Box>

      {/* ── Mobile bottom drawer ── */}
      <DrawerRoot
        open={drawerOpen}
        onOpenChange={e => setDrawerOpen(e.open)}
        placement="bottom"
      >
        <DrawerBackdrop />
        <DrawerContent
          borderTopRadius="xl"
          maxH="85vh"
        >
          <DrawerHeader borderBottomWidth="1px" pb={3}>
            <Flex justify="space-between" align="center">
              <Text fontWeight="bold">Paint Controls</Text>
              <DrawerCloseTrigger asChild>
                <Button size="sm" variant="ghost" aria-label="Close">✕</Button>
              </DrawerCloseTrigger>
            </Flex>
          </DrawerHeader>
          <DrawerBody pb={8} overflowY="auto">
            {sidebarContent}
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

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
    </Flex>
  )
}
