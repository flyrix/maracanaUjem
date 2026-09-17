import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LigneMatch } from '@/components/LigneMatch'
import type { Equipe, Match } from '@/lib/types'

export default function Accueil() {
  const [matchs, setMatchs] = useState<Match[]>([])
  const [equipes, setEquipes] = useState<Record<string, Equipe>>({})
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [m, e] = await Promise.all([
        supabase.from('matchs').select('*').order('debut_prevu', { ascending: true }).limit(20),
        supabase.from('equipes').select('*')
      ])
      setMatchs((m.data as Match[]) ?? [])
      setEquipes(Object.fromEntries(((e.data as Equipe[]) ?? []).map(x => [x.id, x])))
      setChargement(false)
    })()
  }, [])

  // Garde le fil à jour sans recharger la page : score et minuteur des matchs
  // en cours suivent la table de marque en direct.
  useEffect(() => {
    const canal = supabase
      .channel('accueil-matchs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matchs' }, p => {
        setMatchs(prev => prev.map(m => (m.id === (p.new as Match).id ? (p.new as Match) : m)))
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  const enCours = matchs.filter(m => m.statut === 'en_cours' || m.statut === 'pause')
  const aVenir = matchs.filter(m => m.statut === 'a_venir')
  const joues = matchs.filter(m => m.statut === 'termine')

  if (chargement) return <p className="p-6 text-chalk/60">Chargement du fil…</p>

  if (matchs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="font-display text-3xl">Le tournoi n'a pas encore de match</h1>
        <p className="mt-2 max-w-md text-chalk/70">
          Dès que l'organisateur programme les rencontres, le fil s'anime ici : scores en direct,
          buteurs et comptes-rendus d'après-match.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      {enCours.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-2xl">
            <span className="h-2.5 w-2.5 rounded-full bg-flame" /> Ça joue maintenant
          </h2>
          <div className="space-y-2">{enCours.map(m => <LigneMatch key={m.id} match={m} equipes={equipes} />)}</div>
        </section>
      )}

      {aVenir.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Prochaines rencontres</h2>
          <div className="space-y-2">{aVenir.map(m => <LigneMatch key={m.id} match={m} equipes={equipes} />)}</div>
        </section>
      )}

      {joues.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Déjà jouées</h2>
          <div className="space-y-2">{joues.map(m => <LigneMatch key={m.id} match={m} equipes={equipes} />)}</div>
        </section>
      )}
    </div>
  )
}