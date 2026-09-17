import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useMatchLive } from '@/hooks/useMatchLive'
import { useChrono } from '@/hooks/useChrono'
import { Tableau } from '@/components/Tableau'
import { CartonBleu } from '@/components/CartonBleu'
import { EVENEMENTS } from '@/lib/rules'
import type { Equipe, Membre, Tournoi } from '@/lib/types'

export default function MatchLive() {
  const { id } = useParams()
  const { match, evenements, connecte } = useMatchLive(id)
  const [tournoi, setTournoi] = useState<Tournoi | null>(null)
  const secondes = useChrono(match, tournoi?.duree_periode_sec)
  const [equipes, setEquipes] = useState<Record<string, Equipe>>({})
  const [membres, setMembres] = useState<Record<string, Membre>>({})

  useEffect(() => {
    if (!match) return
    ;(async () => {
      const ids = [match.equipe_dom, match.equipe_ext]
      const [e, m, t] = await Promise.all([
        supabase.from('equipes').select('*').in('id', ids),
        supabase.from('membres').select('*').in('equipe_id', ids),
        supabase.from('tournois').select('*').eq('id', match.tournoi_id).single()
      ])
      setEquipes(Object.fromEntries(((e.data as Equipe[]) ?? []).map(x => [x.id, x])))
      setMembres(Object.fromEntries(((m.data as Membre[]) ?? []).map(x => [x.id, x])))
      setTournoi(t.data as Tournoi)
    })()
  }, [match?.id])

  if (!match) return <p className="p-6 text-chalk/60">Chargement du match…</p>
  const dom = equipes[match.equipe_dom]
  const ext = equipes[match.equipe_ext]
  if (!dom || !ext) return <p className="p-6 text-chalk/60">Chargement des équipes…</p>

  const exclusions = evenements.filter(
    e => e.type === 'carton_bleu' && e.expire_a && new Date(e.expire_a) > new Date()
  )

  return (
    <div className="space-y-5 p-4 md:p-6">
      <Tableau match={match} dom={dom} ext={ext} secondes={secondes} />

      {!connecte && <p className="text-xs text-chalk/50">Reconnexion au direct…</p>}

      {exclusions.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-xl">Exclusions temporaires</h2>
          <div className="flex flex-wrap gap-2">
            {exclusions.map(e => (
              <CartonBleu key={e.id} expireA={e.expire_a!} joueur={membres[e.membre_id ?? '']?.nom ?? 'Joueur'} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-xl">Déroulé du match</h2>
        {evenements.length === 0 ? (
          <p className="text-chalk/55">Aucun fait de jeu pour l'instant.</p>
        ) : (
          <ol className="space-y-1.5">
            {[...evenements].reverse().map(e => {
              const meta = EVENEMENTS[e.type]
              return (
                <li key={e.id} className="board flex items-center gap-3 px-3 py-2">
                  <span className="w-9 font-num text-lg tabular-nums text-chalk/60">{e.minute}'</span>
                  <span className="h-4 w-3 shrink-0 rounded-[2px]" style={{ background: meta.couleur }} />
                  <span className="min-w-0 flex-1 truncate">
                    {membres[e.membre_id ?? '']?.nom ?? meta.libelle}
                    <span className="ml-2 text-chalk/50">{meta.libelle}</span>
                  </span>
                  <span className="text-xs text-chalk/45">{equipes[e.equipe_id ?? '']?.nom}</span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {match.resume_ia && (
        <section className="board p-4">
          <h2 className="mb-2 font-display text-xl">Compte-rendu</h2>
          <p className="whitespace-pre-line leading-relaxed text-chalk/85">{match.resume_ia}</p>
          <p className="mt-3 text-xs text-chalk/40">Rédigé par l'assistant du tournoi ({match.resume_ia_style}).</p>
        </section>
      )}
    </div>
  )
}