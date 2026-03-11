"use client"

import { Box, Grid, Text, HStack } from "@chakra-ui/react"

const PALETTE = [
  { color: "#1A1A2E", label: "Midnight" },
  { color: "#344E5B", label: "Ocean" },
  { color: "#49AF9B", label: "Teal" },
  { color: "#EDC557", label: "Gold" },
  { color: "#E07847", label: "Ember" },
  { color: "#ED3D5A", label: "Crimson" },
  { color: "#7B2D8B", label: "Violet" },
  { color: "#2D8B7B", label: "Jade" },
  { color: "#FFFFFF", label: "White" },
  { color: "#CCCCCC", label: "Silver" },
  { color: "#888888", label: "Gray" },
  { color: "#000000", label: "Black" },
]

interface Props {
  selected: string
  onChange: (color: string) => void
  /** Compact mode: hide label and custom color input (for mobile drawer) */
  compact?: boolean
}

export function ColorPicker({ selected, onChange, compact }: Props) {
  return (
    <Box>
      {!compact && (
        <Text fontWeight="semibold" mb={2} fontSize="sm">
          Color
        </Text>
      )}

      {/* Palette swatches */}
      <Grid templateColumns="repeat(6, 1fr)" gap={1} mb={compact ? 0 : 3}>
        {PALETTE.map(({ color, label }) => (
          <Box
            key={color}
            w="full"
            aspectRatio="1"
            bg={color}
            borderRadius="sm"
            cursor="pointer"
            border="2px solid"
            borderColor={selected === color ? "blue.400" : "transparent"}
            boxShadow={selected === color ? "0 0 0 1px white" : "none"}
            title={label}
            onClick={() => onChange(color)}
            transition="transform 0.1s"
            _hover={{ transform: "scale(1.15)", zIndex: 1 }}
          />
        ))}
      </Grid>

      {/* Custom color input */}
      <HStack gap={2} align="center" mt={compact ? 2 : 0}>
        {!compact && (
          <Text fontSize="xs" color="text.subtle">Custom:</Text>
        )}
        <Box position="relative" w={8} h={7} flexShrink={0} title="Custom color">
          <input
            id="custom-color"
            type="color"
            value={selected}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
            }}
          />
          <Box
            w={8}
            h={7}
            borderRadius="sm"
            bg={selected}
            border="2px solid"
            borderColor="border.primary"
            pointerEvents="none"
          />
        </Box>
        {!compact && (
          <Text fontSize="xs" color="text.subtle" fontFamily="mono">
            {selected.toUpperCase()}
          </Text>
        )}
      </HStack>
    </Box>
  )
}
