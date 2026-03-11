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
} from "@chakra-ui/react"
import { LuDownload, LuRefreshCw } from "react-icons/lu"
import { useWallet, TransactionModal, useTransactionModal } from "@vechain/vechain-kit"
import { useCanvasPixels } from "@/hooks/useCanvasPixels"
import { usePaintPixels } from "@/hooks/usePaintPixels"
import { PixelCanvas } from "./PixelCanvas"
import { ColorPicker } from "./ColorPicker"
import { PixelQueue } from "./PixelQueue"
import type { QueuedPixel } from "@/lib/types"
import { CANVAS_SIZE } from "@/lib/contract"

export function CanvasPanel() {
  const { account, connection } = useWallet()
  const isConnected = connection.isConnected

  // Canvas state
  const { data: pixels = [], isLoading, isFetching, refetch, isRefetching } = useCanvasPixels()
  // Only show full loading state on the very first fetch (no data yet)
  const showInitialLoader = isLoading && pixels.length === 0
  const [queue, setQueue] = useState<QueuedPixel[]>([])
  const [selectedColor, setSelectedColor] = useState("#344E5B")
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null)

  // Transaction
  const { paintPixels, status, txReceipt, resetStatus, isTransactionPending, error } =
    usePaintPixels()
  const { open: openTxModal, close: closeTxModal, isOpen: isTxModalOpen } = useTransactionModal()

  const handlePixelClick = useCallback(
    (x: number, y: number) => {
      setSelectedPixel({ x, y })
      // Add or update in queue
      setQueue(prev => {
        const existing = prev.findIndex(p => p.x === x && p.y === y)
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = { x, y, color: selectedColor }
          return next
        }
        return [...prev, { x, y, color: selectedColor }]
      })
    },
    [selectedColor]
  )

  const handleRemoveFromQueue = useCallback((x: number, y: number) => {
    setQueue(prev => prev.filter(p => !(p.x === x && p.y === y)))
  }, [])

  const handleClearQueue = useCallback(() => setQueue([]), [])

  const handleUndo = useCallback(() => {
    setQueue(prev => prev.slice(0, -1))
  }, [])

  const handlePaint = useCallback(async () => {
    if (queue.length === 0) return
    openTxModal()
    try {
      await paintPixels(queue)
      setQueue([])
    } catch {
      // error shown in TransactionModal
    }
  }, [queue, paintPixels, openTxModal])

  const handleDownload = useCallback(() => {
    // Composite base + overlay layers into a single image
    const canvases = document.querySelectorAll("canvas")
    const base = canvases[0] as HTMLCanvasElement | undefined
    if (!base) return
    const composite = document.createElement("canvas")
    composite.width = base.width
    composite.height = base.height
    const ctx = composite.getContext("2d")
    if (!ctx) return
    canvases.forEach(c => ctx.drawImage(c, 0, 0))
    composite.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "CommunityCanvas.png"
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [])

  return (
    <Flex gap={6} direction={{ base: "column", lg: "row" }} align={{ base: "center", lg: "start" }}>
      {/* Canvas */}
      <VStack gap={3} align="center" flex="0 0 auto">
        <Flex w="full" justify="space-between" align="center" maxW={`${CANVAS_SIZE * 6}px`}>
          <HStack gap={2}>
            <Text fontWeight="bold" fontSize="sm">
              Community Canvas
            </Text>
            <Badge colorPalette="green" size="sm">
              Mainnet
            </Badge>
          </HStack>
          <HStack gap={1}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label="Refresh canvas">
              <LuRefreshCw style={{ opacity: isRefetching ? 0.5 : 1 }} />
            </Button>
            <Button size="xs" variant="ghost" onClick={handleDownload} aria-label="Download PNG">
              <LuDownload />
            </Button>
          </HStack>
        </Flex>

        {/* Canvas is always mounted — spinner overlays on top during initial load */}
        <Box position="relative">
          <PixelCanvas pixels={pixels} queue={queue} onPixelClick={handlePixelClick} />

          {/* Initial load overlay — sits on top, canvas stays mounted underneath */}
          {showInitialLoader && (
            <Flex
              position="absolute"
              inset={0}
              align="center"
              justify="center"
              bg="rgba(255,255,255,0.92)"
              zIndex={10}>
              <VStack gap={3}>
                <Spinner size="lg" />
                <Text fontSize="sm" color="text.subtle">
                  Loading canvas from chain...
                </Text>
              </VStack>
            </Flex>
          )}

          {/* Subtle sync dot — top right corner during background polls */}
          {isFetching && !showInitialLoader && (
            <Box
              position="absolute"
              top={2}
              right={2}
              w={2}
              h={2}
              borderRadius="full"
              bg="blue.400"
              opacity={0.7}
              title="Syncing..."
            />
          )}
        </Box>

        {selectedPixel && (
          <Text fontSize="xs" color="text.subtle">
            Selected: ({selectedPixel.x}, {selectedPixel.y}) — click the canvas to pick a pixel
          </Text>
        )}
      </VStack>

      {/* Sidebar */}
      <VStack
        gap={4}
        align="stretch"
        flex={1}
        minW={{ base: "full", lg: "280px" }}
        maxW={{ base: "full", lg: "340px" }}>
        <ColorPicker selected={selectedColor} onChange={setSelectedColor} />

        <Separator />

        {selectedPixel && (
          <Box>
            <Text fontSize="sm" color="text.subtle" mb={2}>
              Selected pixel:{" "}
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
                as="span"
                display="inline-block"
                w={3}
                h={3}
                bg={selectedColor}
                border="1px solid currentColor"
                borderRadius="2px"
                mx={1}
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

        <Box pt={2}>
          <Text fontSize="xs" color="text.subtle">
            Click any pixel on the canvas to select it. Choose a color, then queue the pixel.
            When ready, sign a single transaction to write all queued pixels to the VeChain
            blockchain. Each pixel is a separate clause in one multi-clause transaction.
          </Text>
        </Box>
      </VStack>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          closeTxModal()
          resetStatus()
        }}
        onTryAgain={() => {
          resetStatus()
          handlePaint()
        }}
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
