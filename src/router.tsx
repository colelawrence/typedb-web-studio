import { createRouter } from '@tanstack/react-router'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()
  const basepath = getRouterBasePath(import.meta.env.BASE_URL)

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    basepath,
    defaultPreload: 'intent',
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <TanstackQuery.Provider {...rqContext}>
          {props.children}
        </TanstackQuery.Provider>
      )
    },
  })

  return router
}

function getRouterBasePath(value: string | undefined) {
  if (!value || value === '/' || value === './') {
    return undefined
  }

  return value.replace(/\/+$/, '')
}
