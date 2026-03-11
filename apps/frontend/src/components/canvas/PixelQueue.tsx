"use client"

import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react"
import { LuX } from "react-icons/lu"
import type { QueuedPixel } from "@/lib/types"

interface Props {
  queue: QueuedPixel[]
  onRemove: (x: number, y: number) => void
  onClear: () => void
  onPaint: () => void
  isPainting: boolean
  isConnected: boolean
}

export function PixelQueue({
  queue,
  onRemove,
  onClear,
  onPaint,
  isPainting,
  isConnected,
}: Props) {
  if (queue.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Text fontSize="sm" color="text.subtle">
          Click any pixel on the canvas to select it, then add it to the queue.
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={2} align="stretch">
      <Flex justify="space-between" align="center" mb={1}>
        <Text fontWeight="semibold" fontSize="sm">
          Queued Pixels ({queue.length})
        </Text>
        <Button
          size="xs"
          variant="ghost"
          colorPalette="red"
          onClick={onClear}
          disabled={isPainting}>
          Clear all
        </Button>
      </Flex>

      <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
        {queue.map(p => (
          <HStack
            key={`${p.x},${p.y}`}
            px={2}
            py={1}
            borderRadius="md"
            bg="bg.secondary"
            justify="space-between">
            <HStack gap={2}>
              <Box
                w={4}
                h={4}
                borderRadius="sm"
                bg={p.color}
                border="1px solid"
                borderColor="border.primary"
                flexShrink={0}
              />
              <Text fontSize="xs" fontFamily="mono">
                ({p.x}, {p.y})
              </Text>
              <Text fontSize="xs" color="text.subtle" fontFamily="mono">
                {p.color.toUpperCase()}
              </Text>
            </HStack>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onRemove(p.x, p.y)}
              disabled={isPainting}
              aria-label={`Remove pixel ${p.x},${p.y}`}>
              <LuX />
            </Button>
          </HStack>
        ))}
      </VStack>

      <Button
        mt={2}
        colorPalette="blue"
        size="md"
        w="full"
        onClick={onPaint}
        disabled={!isConnected || isPainting || queue.length === 0}
        loading={isPainting}
        loadingText="Signing...">
        {!isConnected ? "Connect Wallet to Paint" : `Write ${queue.length} Pixel${queue.length !== 1 ? "s" : ""} to Chain`}
      </Button>
    </VStack>
  )
}
