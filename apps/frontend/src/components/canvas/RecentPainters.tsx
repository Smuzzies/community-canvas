"use client"

import { useMemo } from "react"
import { Box, HStack, Text, VStack, Spinner } from "@chakra-ui/react"
import { useVechainDomain } from "@vechain/vechain-kit"
import { shortAddress } from "@/lib/contract"
import type { Pixel } from "@/lib/types"

const MAX_RECENT  = 20
const ROW_HEIGHT  = 36   // px — used to set a fixed visible window of ~10 rows
const VISIBLE_ROWS = 10

interface RecentEntry {
  painter: string
  color: string
  blockNumber: number
  x: number
  y: number
}

function PainterRow({ entry }: { entry: RecentEntry }) {
  const { data: domainData } = useVechainDomain(entry.painter)
  const label = domainData?.domain ?? shortAddress(entry.painter)

  return (
    <HStack
      gap={2}
      px={2}
      h={`${ROW_HEIGHT}px`}
      borderRadius="sm"
      _hover={{ bg: "bg.secondary" }}
      transition="background 0.12s"
      flexShrink={0}
    >
      <Box
        w={3} h={3}
        borderRadius="2px"
        bg={entry.color}
        border="1px solid"
        borderColor="border.primary"
        flexShrink={0}
      />
      <Text fontSize="xs" fontFamily="mono" fontWeight="medium" flex={1} truncate>
        {label}
      </Text>
      <Text fontSize="xs" fontFamily="mono" color="text.subtle" flexShrink={0}>
        ({entry.x}, {entry.y})
      </Text>
      <Text fontSize="xs" fontFamily="mono" color="text.muted" flexShrink={0}>
        #{entry.blockNumber.toLocaleString()}
      </Text>
    </HStack>
  )
}

interface Props {
  pixels: Pixel[]
  isLoading: boolean
}

export function RecentPainters({ pixels, isLoading }: Props) {
  const recent = useMemo<RecentEntry[]>(() => {
    return pixels
      .filter(p => p.blockNumber > 0)
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, MAX_RECENT)
      .map(p => ({ painter: p.painter, color: p.color, blockNumber: p.blockNumber, x: p.x, y: p.y }))
  }, [pixels])

  return (
    <VStack gap={2} align="stretch">
      <HStack gap={2}>
        <Text fontWeight="semibold" fontSize="sm">Recent Painters</Text>
        {isLoading && <Spinner size="xs" />}
        {recent.length > 0 && (
          <Text fontSize="xs" color="text.muted">({recent.length})</Text>
        )}
      </HStack>

      {recent.length === 0 && !isLoading && (
        <Text fontSize="xs" color="text.subtle" px={2}>No paintings yet.</Text>
      )}

      {recent.length > 0 && (
        <Box
          overflowY="auto"
          maxH={`${ROW_HEIGHT * VISIBLE_ROWS}px`}
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
          css={{
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--chakra-colors-border-emphasized, rgba(0,0,0,0.2))",
              borderRadius: "2px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "var(--chakra-colors-border-primary, rgba(0,0,0,0.35))",
            },
            "scrollbarWidth": "thin",
            "scrollbarColor": "var(--chakra-colors-border-emphasized, rgba(0,0,0,0.2)) transparent",
          }}
        >
          {recent.map(entry => (
            <PainterRow key={`${entry.x},${entry.y}`} entry={entry} />
          ))}
        </Box>
      )}
    </VStack>
  )
}
