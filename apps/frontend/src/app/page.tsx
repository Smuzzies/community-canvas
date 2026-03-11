"use client"

import dynamic from "next/dynamic"

const CanvasPanel = dynamic(
  () => import("@/components/canvas/CanvasPanel").then(mod => mod.CanvasPanel),
  { ssr: false }
)

const CONTRACT = "0x755405995c9919fdf5387f73811b7b46f5257d01"
const STATS_URL = `https://explore.vechain.org/address/${CONTRACT}`

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

      {/* OG credit */}
      <div style={{
        marginTop: 40,
        padding: "16px 20px",
        borderTop: "1px solid var(--chakra-colors-whiteAlpha-200, rgba(255,255,255,0.08))",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}>
        <img
          src="/nftpaperproject.ico"
          alt="NFT Paper Project"
          width={24}
          height={24}
          style={{ borderRadius: 4, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 12, color: "var(--chakra-colors-text-subtle, #888)", margin: "0 0 4px 0", lineHeight: 1.5 }}>
            Inspired by the{" "}
            <a href="https://nftpaperproject.com" target="_blank" rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
              NFT Paper Project
            </a>
            {" "}— the OG community canvas. Two completed canvases from 2021 and 2022 live on forever:
          </p>
          <p style={{ fontSize: 12, color: "var(--chakra-colors-text-subtle, #888)", margin: 0, lineHeight: 1.8 }}>
            <a href="https://nftpaperproject.com/assets/community-canvas.2021.png" target="_blank" rel="noopener noreferrer" download
              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Community Canvas 2021
            </a>
            {" "}·{" "}
            <a href="https://nftpaperproject.com/assets/CommunityCanvas2022_Ocean_Dusk.png" target="_blank" rel="noopener noreferrer" download
              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Community Canvas 2022
            </a>
          </p>
        </div>
      </div>

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
