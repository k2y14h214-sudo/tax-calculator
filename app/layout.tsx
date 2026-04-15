import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: '투잡러를 위한 종합소득세 계산기',
  description: '부업 수입이 있는 직장인을 위한 종합소득세 계산기. 합산신고 vs 분리과세 비교, 환급/납부액 계산까지.',
  keywords: '종합소득세 계산기, 투잡 세금, 부업 세금, 분리과세, 합산신고, 종소세',
  generator: 'v0.app',
  openGraph: {
    title: '투잡러를 위한 종합소득세 계산기',
    description: '부업 수입이 있는 직장인을 위한 종합소득세 계산기. 합산신고 vs 분리과세 비교, 환급/납부액 계산까지.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8970993160877603"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
