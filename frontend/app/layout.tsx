import type { Metadata } from 'next'
import { inter, playfair, spaceGrotesk, fraunces, dmSans } from './fonts'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Bookeiro',
    default: 'Bookeiro — Plataforma SaaS para Barberías',
  },
  description:
    'Bookeiro es la plataforma SaaS B2B2C multi-tenant para la gestión integral de centros de cuidado personal: agendamiento, POS, comisiones y más.',
  keywords: ['barbería', 'SaaS', 'agendamiento', 'POS', 'gestión de negocio', 'Bookeiro'],
  authors: [{ name: 'Bookeiro' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'Bookeiro',
    locale: 'es_CO',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${spaceGrotesk.variable} ${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
