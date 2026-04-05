import { createFileRoute } from '@tanstack/react-router'
import { BirdsEyeView } from '../components/BirdsEyeView'

export const Route = createFileRoute('/birdseye')({
  component: BirdsEyeView,
})
