import { useEffect, useState } from 'react'
import { db } from '@/lib/db'
import { surEtatSynchro } from '@/lib/sync'
import type { EvenementLocal, SuppressionLocale } from '@/lib/types'

export function useOutboxMatch(matchId: string | undefined) {
  const [evenements, setEvenements] = useState<EvenementLocal[]>([])
  const [suppressions, setSuppressions] = useState<SuppressionLocale[]>([])

  useEffect(() => {
    if (!matchId) return
    let vivant = true

    const charger = async () => {
      const [evs, dels] = await Promise.all([
        db.outbox.where('match_id').equals(matchId).toArray(),
        db.suppressions.where('match_id').equals(matchId).toArray()
      ])
      if (!vivant) return
      setEvenements(evs)
      setSuppressions(dels)
    }

    void charger()
    const retirer = surEtatSynchro(() => void charger())
    return () => { vivant = false; retirer() }
  }, [matchId])

  return { evenements, suppressions }
}
