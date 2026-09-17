import { Blason } from './Blason'
import { chrono } from '@/lib/format'
import type { Equipe, Match } from '@/lib/types'

/** Tableau d'affichage : l'élément central, lisible depuis le bord du terrain. */
export function Tableau({ match, dom, ext, secondes }: {
  match: Match; dom: Equipe; ext: Equipe; secondes: number
}) {
  const etat = { a_venir: 'À venir', en_cours: 'En cours', pause: 'Pause', termine: 'Terminé' }[match.statut]
  return (
    <div className="board p-5">
      <div className="flex items-center justify-between text-xs text-chalk/60">
        <span>{match.phase === 'poule' ? 'Phase de poules' : match.phase}{match.terrain ? ` · ${match.terrain}` : ''}</span>
        <span className="flex items-center gap-1.5">
          {match.statut === 'en_cours' && <span className="h-2 w-2 rounded-full bg-flame" />}
          {etat}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <Blason equipe={dom} taille={40} />
          <span className="font-display text-xl leading-tight">{dom.nom}</span>
        </div>
        <div className="text-center">
          <div className="score">{match.score_dom} <span className="text-chalk/30">:</span> {match.score_ext}</div>
          <div className="mt-1 font-num text-2xl tabular-nums text-flame">{chrono(secondes)}</div>
          <div className="text-xs text-chalk/50">{match.periode}<sup>{match.periode === 1 ? 're' : 'e'}</sup> période</div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Blason equipe={ext} taille={40} />
          <span className="font-display text-xl leading-tight">{ext.nom}</span>
        </div>
      </div>
    </div>
  )
}
