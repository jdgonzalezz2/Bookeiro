/**
 * Prototype route — now a thin wrapper around the shared <TimeRailEmbed />, the
 * same component the landing uses. All rail markup/CSS lives in the embed.
 */
import type { Metadata } from 'next'
import TimeRailEmbed from './TimeRailEmbed'

export const metadata: Metadata = { title: 'Time-Rail · Prototipo (demo)' }

export default function TimeRailPreviewPage() {
  return <TimeRailEmbed />
}
