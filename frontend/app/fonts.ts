import { Inter, Playfair_Display, Space_Grotesk, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google'

// Kept ONLY for the tenant-customizable public storefront (owners can pick
// Inter / Playfair Display / Space Grotesk for their own vitrina).
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
export const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
export const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' })

// COMPÁS system (Step 13): Hanken Grotesk for display / UI / body, IBM Plex Mono
// for time, money, and other measured data. These define the product voice.
export const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' })
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})
