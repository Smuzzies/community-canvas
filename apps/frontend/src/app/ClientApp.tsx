"use client"

import { Box, Flex, VStack } from "@chakra-ui/react"
import { Navbar } from "@/components/Navbar"
import { Providers } from "./providers"

export function ClientApp({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <VStack minH="100vh" gap={0} align="stretch">
        <Navbar />
        <Box flex={1}>
          {children}
        </Box>
      </VStack>
    </Providers>
  )
}
