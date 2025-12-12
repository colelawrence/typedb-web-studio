import { createFileRoute } from '@tanstack/react-router'
import { StudioAppProvider } from '../components/app/StudioApp'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return <StudioAppProvider />
}
