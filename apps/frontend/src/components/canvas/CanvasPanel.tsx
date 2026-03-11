"use client"

import { useCallback, useRef, useState } from "react"
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
import type { Pixel, QueuedPixel } from "@/lib/types"
import { CANVAS_SIZE } from "@/lib/contract"

export function CanvasPanel() {
  const { account, connection } = useWallet()
  const isConnected = connection.isConnected

  // Canvas state
  const { data: pixels = [], isLoading, refetch, isRefetching } = useCanvasPixels()
  const [queue, setQueue] = useState<QueuedPixel[]>([])
  const [selectedColor, setSelectedColor] = useState("#344E5B")
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null)

  // Transaction
  const { paintPixels, status, txReceipt, resetStatus, isTransactionPending, error } =
    usePaintPixels()
  const { open: openTxModal, close: closeTxModal, isOpen: isTxModalOpen } = useTransactionModal()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return
    canvas.toBlob(blob => {
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

        {isLoading ? (
          <Flex
            w={`${CANVAS_SIZE * 6}px`}
            h={`${CANVAS_SIZE * 6}px`}
            align="center"
            justify="center"
            border="1px solid"
            borderColor="border.primary"
            borderRadius="sm">
            <VStack gap={3}>
              <Spinner size="lg" />
              <Text fontSize="sm" color="text.subtle">
                Loading canvas from chain...
              </Text>
            </VStack>
          </Flex>
        ) : (
          <PixelCanvas pixels={pixels} queue={queue} onPixelClick={handlePixelClick} />
        )}

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
