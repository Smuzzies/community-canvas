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

/** Single card — resolves VET domain for one address */
function PainterCard({ entry }: { entry: RecentEntry }) {
  const { data: domainData } = useVechainDomain(entry.painter)
  const label = domainData?.domain ?? shortAddress(entry.painter)

  return (
    <Box
      flexShrink={0}
      w="160px"
      px={3}
      py={2}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
      bg="bg.subtle"
      _hover={{ bg: "bg.secondary", borderColor: "border.emphasized" }}
      transition="all 0.15s"
    >
      <HStack gap={2} mb={1}>
        <Box
          w={4} h={4}
          borderRadius="sm"
          bg={entry.color}
          border="1px solid"
          borderColor="border.primary"
          flexShrink={0}
        />
        <Text fontSize="xs" fontWeight="semibold" fontFamily="mono" truncate flex={1}>
          {label}
        </Text>
      </HStack>
      <Text fontSize="xs" color="text.subtle" fontFamily="mono">
        ({entry.x}, {entry.y})
      </Text>
      <Text fontSize="xs" color="text.muted" fontFamily="mono">
        #{entry.blockNumber.toLocaleString()}
      </Text>
    </Box>
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
      </HStack>

      {recent.length === 0 && !isLoading && (
        <Text fontSize="xs" color="text.subtle">No paintings yet.</Text>
      )}

      {recent.length > 0 && (
        <Box
          overflowX="auto"
          pb={2}
          css={{
            /* Styled scrollbar — matches page theme */
            "&::-webkit-scrollbar": { height: "6px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--chakra-colors-border-emphasized, rgba(0,0,0,0.2))",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "var(--chakra-colors-border-primary, rgba(0,0,0,0.35))",
            },
            "scrollbarWidth": "thin",
            "scrollbarColor": "var(--chakra-colors-border-emphasized, rgba(0,0,0,0.2)) transparent",
          }}
        >
          <HStack gap={2} align="stretch" w="max-content">
            {recent.map(entry => (
              <PainterCard key={`${entry.x},${entry.y}`} entry={entry} />
            ))}
          </HStack>
        </Box>
      )}
    </VStack>
  )
}
