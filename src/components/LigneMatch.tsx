/**
 * Une ligne de match, réutilisée partout où on affiche une liste de rencontres :
 * fil d'actualité, H2H, historique d'une équipe. Cliquable vers le détail,
 * et affiche un minuteur qui tourne en direct si le match est en cours.
 */
import { Link } from 'react-router-dom'
import { Blason } from './Blason'
import { useChrono } from '@/hooks/useChrono'
import { chrono } from '@/lib/format'
import type { Equipe, Match } from '@/lib/types'

export function LigneMatch({ match, equipes }: { match: Match; equipes: Record<string, Equipe> }) {
  const dom = equipes[match.equipe_dom]
  const ext = equipes[match.equipe_ext]
  const secondes = useChrono(match)
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
        {match.statut === 'en_cours' || match.statut === 'pause' ? (
          <span className={`font-num text-lg tabular-nums ${match.statut === 'en_cours' ? 'text-flame' : 'text-chalk/60'}`}>
            {chrono(secondes)}{match.statut === 'pause' && <span className="ml-1 text-xs">pause</span>}
          </span>
        ) : heure}
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