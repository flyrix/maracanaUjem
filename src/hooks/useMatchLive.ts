/**
 * Abonnement temps réel à un match : score et événements diffusés
 * aux supporters par WebSocket dès la validation à la table de marque.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Evenement, Match } from '@/lib/types'

export function useMatchLive(matchId: string | undefined) {
  const [match, setMatch] = useState<Match | null>(null)
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [connecte, setConnecte] = useState(false)

  useEffect(() => {
    if (!matchId) return
    let vivant = true

    ;(async () => {
      const [m, e] = await Promise.all([
        supabase.from('matchs').select('*').eq('id', matchId).single(),
        supabase.from('evenements').select('*').eq('match_id', matchId).order('cree_le')
      ])
      if (!vivant) return
      setMatch((m.data as Match) ?? null)
      setEvenements((e.data as Evenement[]) ?? [])
    })()

    const canal = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matchs', filter: `id=eq.${matchId}` },
        p => setMatch(p.new as Match))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'evenements', filter: `match_id=eq.${matchId}` },
        p => setEvenements(prev => {
          if (p.eventType === 'DELETE') return prev.filter(x => x.id !== (p.old as Evenement).id)
          const ev = p.new as Evenement
          const prochain = prev.some(x => x.id === ev.id)
            ? prev.map(x => x.id === ev.id ? ev : x)
            : [...prev, ev]
          return prochain.sort((a, b) => new Date(a.cree_le).getTime() - new Date(b.cree_le).getTime())
        }))
      .subscribe(s => setConnecte(s === 'SUBSCRIBED'))

    return () => { vivant = false; supabase.removeChannel(canal) }
  }, [matchId])

  return { match, evenements, connecte }
}
