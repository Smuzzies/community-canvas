"use client"

import dynamic from "next/dynamic"

const CanvasPanel = dynamic(
  () => import("@/components/canvas/CanvasPanel").then(mod => mod.CanvasPanel),
  { ssr: false }
)

const CONTRACT = "0xab1b6732fc6b162653261968f91c67cf0968da41"
const STATS_URL = `https://vechainstats.com/account/${CONTRACT}/`

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 57px)" }}>

      {/* Subtitle / instructions */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "var(--chakra-colors-text-subtle, #888)", margin: 0, lineHeight: 1.6 }}>
          A shared 100×100 pixel canvas on the VeChain blockchain. Pick a color, tap a pixel, and write it to the chain — last painter wins. Every pixel is permanent and public.
        </p>
      </div>

      <CanvasPanel />

      {/* Footer */}
      <footer style={{ marginTop: "auto", paddingTop: 32, paddingBottom: 16, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "var(--chakra-colors-text-subtle, #888)", margin: "0 0 4px 0", letterSpacing: "0.04em" }}>
          a dApp by{" "}
          <a href="https://smuzzies.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Smuzzies
          </a>
          {" "}· built on{" "}
          <a href="https://vechain.org" target="_blank" rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
            VeChain
          </a>
          {" "}· 2026
        </p>
        <p style={{ fontSize: 10, color: "var(--chakra-colors-text-subtle, #888)", margin: 0, fontFamily: "monospace", opacity: 0.6 }}>
          <a href={STATS_URL} target="_blank" rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
            {CONTRACT}
          </a>
        </p>
      </footer>
    </div>
  )
}
