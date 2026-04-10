import { createLazyFileRoute } from '@tanstack/react-router'
import { BirdsEyeView } from '../components/BirdsEyeView'

export const Route = createLazyFileRoute('/birdseye')({
  component: BirdsEyeView,
})
