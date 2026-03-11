"use client"

import { useCallback, useEffect, useRef } from "react"
import { Box, Grid, GridItem } from "@chakra-ui/react"
import { CANVAS_SIZE } from "@/lib/contract"

interface Props {
  cursor: { x: number; y: number } | null
  onMove: (x: number, y: number) => void
  /** Called when user presses the centre Paint button */
  onPaint: () => void
}

type Dir = "up" | "down" | "left" | "right"

const HOLD_DELAY  = 350  // ms before hold repeat starts
const HOLD_REPEAT = 80   // ms between repeats while held

function clamp(v: number) {
  return Math.max(0, Math.min(CANVAS_SIZE - 1, v))
}

function DPadButton({
  label,
  onPress,
  onRelease,
  children,
  active = false,
}: {
  label: string
  onPress: () => void
  onRelease: () => void
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Box
      as="button"
      aria-label={label}
      onPointerDown={(e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onPress()
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="40px"
      h="40px"
      borderRadius="lg"
      bg={active ? "blue.500" : "gray.700"}
      color="white"
      fontSize="xl"
      fontWeight="bold"
      userSelect="none"
      cursor="pointer"
      transition="background 0.1s"
      _active={{ bg: "blue.600" }}
      border="1px solid"
      borderColor="gray.600"
      boxShadow="sm"
    >
      {children}
    </Box>
  )
}

export function DPad({ cursor, onMove, onPaint }: Props) {
  const holdTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const cursorRef   = useRef(cursor)

  useEffect(() => { cursorRef.current = cursor }, [cursor])

  const stopHold = useCallback(() => {
    if (holdTimer.current)   { clearTimeout(holdTimer.current);  holdTimer.current   = null }
    if (repeatTimer.current) { clearInterval(repeatTimer.current); repeatTimer.current = null }
  }, [])

  const step = useCallback((dir: Dir) => {
    const cur = cursorRef.current
    if (!cur) return
    const next = { ...cur }
    if      (dir === "up")    next.y = clamp(cur.y - 1)
    else if (dir === "down")  next.y = clamp(cur.y + 1)
    else if (dir === "left")  next.x = clamp(cur.x - 1)
    else if (dir === "right") next.x = clamp(cur.x + 1)
    onMove(next.x, next.y)
  }, [onMove])

  const startHold = useCallback((dir: Dir) => {
    step(dir)
    holdTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => step(dir), HOLD_REPEAT)
    }, HOLD_DELAY)
  }, [step])

  useEffect(() => () => stopHold(), [stopHold])

  const btn = (dir: Dir, label: string, icon: string) => (
    <DPadButton label={label} onPress={() => startHold(dir)} onRelease={stopHold}>
      {icon}
    </DPadButton>
  )

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
      {/* Coordinate display */}
      {cursor && (
        <Box fontSize="xs" color="gray.400" fontFamily="mono" mb={1}>
          ({cursor.x}, {cursor.y})
        </Box>
      )}

      {/* D-pad grid: 3×3, arrow buttons in cross, center = Paint */}
      <Grid templateColumns="40px 40px 40px" templateRows="40px 40px 40px" gap="4px">
        {/* Row 1 */}
        <GridItem />
        <GridItem>{btn("up", "Move up", "▲")}</GridItem>
        <GridItem />

        {/* Row 2 */}
        <GridItem>{btn("left", "Move left", "◀")}</GridItem>
        <GridItem>
          {/* Centre: Paint */}
          <Box
            as="button"
            aria-label="Paint pixel"
            onPointerDown={(e: React.PointerEvent) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              onPaint()
            }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="40px"
            h="40px"
            borderRadius="lg"
            bg={cursor ? "green.500" : "gray.800"}
            color="white"
            fontSize="xs"
            fontWeight="bold"
            userSelect="none"
            cursor={cursor ? "pointer" : "not-allowed"}
            opacity={cursor ? 1 : 0.4}
            border="1px solid"
            borderColor={cursor ? "green.400" : "gray.600"}
            boxShadow="sm"
            transition="background 0.1s"
            _active={{ bg: "green.600" }}
            lineHeight="1.2"
            textAlign="center"
          >
            Paint
          </Box>
        </GridItem>
        <GridItem>{btn("right", "Move right", "▶")}</GridItem>

        {/* Row 3 */}
        <GridItem />
        <GridItem>{btn("down", "Move down", "▼")}</GridItem>
        <GridItem />
      </Grid>
    </Box>
  )
}
