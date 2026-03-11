"use client"

import { useMemo } from "react"
import { Box, HStack, Text, VStack, Spinner } from "@chakra-ui/react"
import { useVechainDomain } from "@vechain/vechain-kit"
import { shortAddress } from "@/lib/contract"
import type { Pixel } from "@/lib/types"

const MAX_RECENT = 20

interface RecentEntry {
  painter: string
  color: string
  blockNumber: number
  x: number
  y: number
}

/** Single row — resolves VET domain for one address */
function PainterRow({ entry }: { entry: RecentEntry }) {
  const { data: domainData } = useVechainDomain(entry.painter)
  const label = domainData?.domain ?? shortAddress(entry.painter)

  return (
    <HStack gap={2} py={1} px={2} borderRadius="md" _hover={{ bg: "bg.secondary" }} transition="background 0.15s">
      <Box
        w={4} h={4}
        borderRadius="sm"
        bg={entry.color}
        border="1px solid"
        borderColor="border.primary"
        flexShrink={0}
      />
      <VStack gap={0} align="start" flex={1} minW={0}>
        <Text fontSize="xs" fontWeight="medium" fontFamily="mono" truncate>
          {label}
        </Text>
        <Text fontSize="xs" color="text.subtle" fontFamily="mono">
          ({entry.x}, {entry.y}) · #{entry.blockNumber.toLocaleString()}
        </Text>
      </VStack>
    </HStack>
  )
}

interface Props {
  pixels: Pixel[]
  isLoading: boolean
}

export function RecentPainters({ pixels, isLoading }: Props) {
  // Derive the 20 most recently painted pixels (highest blockNumber, skip unpainted)
  const recent = useMemo<RecentEntry[]>(() => {
    return pixels
      .filter(p => p.blockNumber > 0)
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, MAX_RECENT)
      .map(p => ({ painter: p.painter, color: p.color, blockNumber: p.blockNumber, x: p.x, y: p.y }))
  }, [pixels])

  return (
    <VStack gap={1} align="stretch">
      <HStack justify="space-between" mb={1}>
        <Text fontWeight="semibold" fontSize="sm">Recent Painters</Text>
        {isLoading && <Spinner size="xs" />}
      </HStack>

      {recent.length === 0 && !isLoading && (
        <Text fontSize="xs" color="text.subtle" px={2}>No paintings yet.</Text>
      )}

      <VStack gap={0} align="stretch">
        {recent.map(entry => (
          <PainterRow key={`${entry.x},${entry.y}`} entry={entry} />
        ))}
      </VStack>
    </VStack>
  )
}
