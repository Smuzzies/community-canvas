import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  cssVarsPrefix: "app",
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          primary: { value: { _light: "#FFFFFF", _dark: "#0A0A0A" } },
          secondary: { value: { _light: "#F5F5F5", _dark: "#141414" } },
        },
        border: {
          primary: { value: { _light: "{colors.gray.200}", _dark: "{colors.gray.800}" } },
        },
        text: {
          subtle: { value: { _light: "{colors.gray.600}", _dark: "{colors.gray.400}" } },
        },
      },
    },
  },
})

export default createSystem(defaultConfig, config)
