// Deterministic, locale-independent formatters shared across the public
// storefront + booking flow. Server and client MUST produce identical strings,
// so we avoid locale-dependent toLocaleString/toLocaleDateString (their output
// varies with the host ICU/locale and breaks hydration). Colombian peso grouping
// (dot thousands) and Spanish month abbreviations, in UTC to avoid TZ drift.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatMoney(n: number | string): string {
  const v = Math.round(Number(n) || 0)
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Pick ink or paper text for legibility on top of an arbitrary tenant color.
export function readableOn(hex: string): string {
  const h = (hex || '').replace('#', '')
  if (h.length < 6) return '#f7f2e7'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return L > 0.6 ? '#1a1712' : '#f7f2e7'
}
