import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Recuperar Contraseña' }
export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
