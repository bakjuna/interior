import { createLazyFileRoute } from '@tanstack/react-router'
import { WalkthroughView } from '../components/WalkthroughView'

export const Route = createLazyFileRoute('/walkthrough')({
  component: WalkthroughView,
})
