import { useEffect, useState } from 'react'
import type { Match } from '@/lib/types'

/**
 * Chronomètre maître : l'heure de départ vit en base, chaque écran la recalcule.
 * `dureePeriodeSec`, quand fourni, plafonne l'affichage à la durée réglementaire
 * de la période — utile le temps que la table de marque valide la fin de période.
 */
export function useChrono(match: Match | null, dureePeriodeSec?: number) {
  const [secondes, setSecondes] = useState(0)

  useEffect(() => {
    if (!match) return
    const calcul = () => {
      const base = match.chrono_offset_sec
      let s = base
      if (match.chrono_demarre_a && match.statut === 'en_cours') {
        s = base + Math.floor((Date.now() - new Date(match.chrono_demarre_a).getTime()) / 1000)
      }
      setSecondes(dureePeriodeSec ? Math.min(s, dureePeriodeSec) : s)
    }
    calcul()
    const t = setInterval(calcul, 1000)
    return () => clearInterval(t)
  }, [match?.chrono_demarre_a, match?.chrono_offset_sec, match?.statut, dureePeriodeSec])

  return secondes
}