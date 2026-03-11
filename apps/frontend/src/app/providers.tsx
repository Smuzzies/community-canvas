"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/api/QueryProvider"
import { Provider } from "@/components/ui/provider"
import { VeChainProvider } from "@/providers/VeChainProvider"

export function Providers({ children }: { readonly children: React.ReactNode }) {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <VeChainProvider>{children}</VeChainProvider>
      </QueryClientProvider>
    </Provider>
  )
}
