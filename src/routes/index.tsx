import { createFileRoute } from '@tanstack/react-router'
import { StudioAppProvider } from '../components/app/StudioApp'

export const Route = createFileRoute('/')({
  // LiveStore requires browser APIs (OPFS, Web Workers) - disable SSR
  ssr: false,
  component: App,
})

function App() {
  return <StudioAppProvider />
}
