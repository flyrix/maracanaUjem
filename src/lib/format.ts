export function chrono(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function minuteDeJeu(sec: number) {
  return Math.floor(sec / 60) + 1
}

export function initiales(nom: string) {
  return nom
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(m => m[0]!.toUpperCase())
    .join('')
}
