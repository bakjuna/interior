import { createFileRoute } from '@tanstack/react-router'
import { WalkthroughView } from '../components/WalkthroughView'

export const Route = createFileRoute('/walkthrough')({
  component: WalkthroughView,
})
