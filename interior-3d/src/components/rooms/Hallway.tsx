/**
 * 복도 — 거실/현관 사이 통로.
 */

interface HallwayProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
}

export function Hallway({ visible }: HallwayProps) {
  return <group visible={visible} />
}
