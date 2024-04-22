import './styles.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'react-photo-view/dist/react-photo-view.css'

import { LiteralProvider } from '@literal-ui/core'
import { ErrorBoundary } from '@sentry/nextjs'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { RecoilRoot } from 'recoil'
import { RecoilEnv } from 'recoil'

import { Layout, Theme } from '../components'
import { NextPage } from 'next'
import { ReactElement, ReactNode, useEffect } from 'react'
import { UrlObject } from 'url'
import { useRouteHistory } from '../hooks/useRouteHistory'
import { timeConfiguration } from '../utils'

RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = false

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter()
  //const [routeHistory, setRouteHistory] = useRouteHistory()
  const getLayout = Component.getLayout ?? ((page) => page)

  useEffect(() => {
    require('../../node_modules/bootstrap/dist/js/bootstrap')
  }, [])

  if (router.pathname === '/success') return <Component {...pageProps} />

  return (
    <ErrorBoundary fallback={<Fallback />}>
      <LiteralProvider>
        <RecoilRoot>
          <Theme />
          {getLayout(<Component {...pageProps} />)}
        </RecoilRoot>
      </LiteralProvider>
    </ErrorBoundary>
  )
}
const Fallback: React.FC = () => {
  return <div>Something went wrong.</div>
}
