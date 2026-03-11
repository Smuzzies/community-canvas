import type { Metadata } from "next"
import dynamic from "next/dynamic"

const ClientApp = dynamic(() => import("./ClientApp").then(mod => mod.ClientApp), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
})

export const metadata: Metadata = {
  title: "Community Canvas",
  description: "Paint pixels on the VeChain blockchain — Community Canvas",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  )
}
