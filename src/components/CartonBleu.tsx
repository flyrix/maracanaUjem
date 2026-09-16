import { useEffect, useState } from 'react'
import { chrono } from '@/lib/format'

/** Badge d'exclusion temporaire : décompte visible par les supporters. */
export function CartonBleu({ expireA, joueur }: { expireA: string; joueur: string }) {
  const [restant, setRestant] = useState(0)

  useEffect(() => {
    const calcul = () => setRestant(Math.max(0, Math.round((new Date(expireA).getTime() - Date.now()) / 1000)))
    calcul()
    const t = setInterval(calcul, 500)
    return () => clearInterval(t)
  }, [expireA])

  if (restant <= 0) return null
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-bleu/15 border border-bleu/60 px-2.5 py-1">
      <span className="h-3.5 w-2.5 rounded-[2px] bg-bleu" />
      <span className="text-sm">{joueur}</span>
      <span className="font-num text-lg tabular-nums text-bleu">{chrono(restant)}</span>
    </span>
  )
}
