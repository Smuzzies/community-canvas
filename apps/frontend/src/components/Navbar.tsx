"use client"

import { Box, Flex, HStack, Text } from "@chakra-ui/react"
import { WalletButton } from "@vechain/vechain-kit"
import { ColorModeButton } from "@/components/ui/color-mode"

export function Navbar() {
  return (
    <Box as="nav" bg="bg.secondary" px={4} py={3} borderBottomWidth="1px">
      <Flex maxW="breakpoint-xl" mx="auto" align="center" justify="space-between">
        <HStack gap={2}>
          <Text fontSize="xl" fontWeight="bold" letterSpacing="tight">
            Community Canvas
          </Text>
          <Text fontSize="xs" color="text.subtle" display={{ base: "none", md: "block" }}>
            Paint pixels on VeChain
          </Text>
        </HStack>
        <HStack gap={2}>
          <ColorModeButton />
          <WalletButton />
        </HStack>
      </Flex>
    </Box>
  )
}
