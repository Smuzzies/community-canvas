"use client"

import dynamic from "next/dynamic"

const CanvasPanel = dynamic(
  () => import("@/components/canvas/CanvasPanel").then(mod => mod.CanvasPanel),
  { ssr: false }
)

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <CanvasPanel />
    </div>
  )
}
