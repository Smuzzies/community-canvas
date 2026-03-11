"use client"

import { Button, ClientOnly, Skeleton, type IconButtonProps } from "@chakra-ui/react"
import { ThemeProvider, useTheme, type ThemeProviderProps } from "next-themes"
import * as React from "react"
import { LuMoon, LuSun } from "react-icons/lu"

export type ColorMode = "light" | "dark"
export type ColorModeProviderProps = ThemeProviderProps

export interface UseColorModeReturn {
  colorMode: ColorMode
  setColorMode: (colorMode: ColorMode) => void
  toggleColorMode: () => void
}

export function ColorModeProvider(props: ThemeProviderProps) {
  return <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange {...props} />
}

export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  const colorMode = forcedTheme ?? resolvedTheme
  return {
    colorMode: (colorMode ?? "light") as ColorMode,
    setColorMode: setTheme,
    toggleColorMode: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  }
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode()
  return colorMode === "dark" ? dark : light
}

function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return colorMode === "light" ? <LuMoon /> : <LuSun />
}

interface ColorModeButtonProps extends Omit<IconButtonProps, "aria-label"> {}

export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode()
    return (
      <ClientOnly fallback={<Skeleton boxSize="8" />}>
        <Button
          onClick={toggleColorMode}
          variant="ghost"
          aria-label="Toggle color mode"
          size="sm"
          ref={ref}
          {...props}>
          <ColorModeIcon />
        </Button>
      </ClientOnly>
    )
  },
)
