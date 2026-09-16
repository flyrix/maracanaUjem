import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Blason } from '@/components/Blason'
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
          <div className="space-y-2">{enCours.map(m => <Ligne key={m.id} match={m} equipes={equipes} />)}</div>
        </section>
      )}

      {aVenir.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Prochaines rencontres</h2>
          <div className="space-y-2">{aVenir.map(m => <Ligne key={m.id} match={m} equipes={equipes} />)}</div>
        </section>
      )}

      {joues.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Déjà jouées</h2>
          <div className="space-y-2">{joues.map(m => <Ligne key={m.id} match={m} equipes={equipes} />)}</div>
        </section>
      )}
    </div>
  )
}

function Ligne({ match, equipes }: { match: Match; equipes: Record<string, Equipe> }) {
  const dom = equipes[match.equipe_dom]
  const ext = equipes[match.equipe_ext]
  if (!dom || !ext) return null
  const heure = match.debut_prevu
    ? new Date(match.debut_prevu).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Horaire à confirmer'

  return (
    <Link to={`/match/${match.id}`} className="board flex items-center gap-3 p-3 hover:border-flame/50">
      <div className="min-w-0 flex-1 space-y-2">
        <Camp equipe={dom} score={match.score_dom} gagne={match.score_dom > match.score_ext && match.statut === 'termine'} />
        <Camp equipe={ext} score={match.score_ext} gagne={match.score_ext > match.score_dom && match.statut === 'termine'} />
      </div>
      <div className="shrink-0 border-l border-white/10 pl-3 text-right text-xs text-chalk/55">
        {match.statut === 'en_cours' ? <span className="text-flame">Direct</span> : heure}
        {match.terrain && <div>{match.terrain}</div>}
      </div>
    </Link>
  )
}

function Camp({ equipe, score, gagne }: { equipe: Equipe; score: number; gagne: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${gagne ? '' : 'text-chalk/85'}`}>
      <Blason equipe={equipe} taille={22} />
      <span className="min-w-0 flex-1 truncate">{equipe.nom}</span>
      <span className="font-num text-2xl tabular-nums">{score}</span>
    </div>
  )
}
