import { createFileRoute } from '@tanstack/react-router'
import { FloorPlanView } from '../components/FloorPlanView'

export const Route = createFileRoute('/')({
  component: FloorPlanView,
})
