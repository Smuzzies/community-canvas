/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    // Polyfill `self` for server-side builds (VeChain Kit deps reference it at module level)
    if (isServer) {
      const webpack = require("webpack")
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.DefinePlugin({
          self: "globalThis",
        })
      )
    }
    return config
  },
}

module.exports = nextConfig
