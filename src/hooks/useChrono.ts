import { useEffect, useState } from 'react'
import type { Match } from '@/lib/types'

/** Chronomètre maître : l'heure de départ vit en base, chaque écran la recalcule. */
export function useChrono(match: Match | null) {
  const [secondes, setSecondes] = useState(0)

  useEffect(() => {
    if (!match) return
    const calcul = () => {
      const base = match.chrono_offset_sec
      if (!match.chrono_demarre_a || match.statut !== 'en_cours') return setSecondes(base)
      setSecondes(base + Math.floor((Date.now() - new Date(match.chrono_demarre_a).getTime()) / 1000))
    }
    calcul()
    const t = setInterval(calcul, 1000)
    return () => clearInterval(t)
  }, [match?.chrono_demarre_a, match?.chrono_offset_sec, match?.statut])

  return secondes
}
