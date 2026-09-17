/** Espace du PCO : uniquement les matchs qui lui sont assignés. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Blason } from '@/components/Blason'
import type { Equipe, Match } from '@/lib/types'

const LIBELLE_STATUT: Record<Match['statut'], string> = {
  a_venir: 'À venir', en_cours: 'En cours', pause: 'En pause', termine: 'Terminé'
}

export default function MesMatchs() {
  const { profil, chargement, deconnexion } = useAuth()
  const [matchs, setMatchs] = useState<Match[]>([])
  const [equipes, setEquipes] = useState<Record<string, Equipe>>({})

  useEffect(() => {
    if (!profil) return
    ;(async () => {
      const { data: m } = await supabase.from('matchs').select('*').eq('pco_id', profil.id).order('debut_prevu')
      const liste = (m as Match[]) ?? []
      setMatchs(liste)
      if (liste.length === 0) return
      const ids = [...new Set(liste.flatMap(x => [x.equipe_dom, x.equipe_ext]))]
      const { data: e } = await supabase.from('equipes').select('*').in('id', ids)
      setEquipes(Object.fromEntries(((e as Equipe[]) ?? []).map(x => [x.id, x])))
    })()
  }, [profil?.id])

  if (chargement) return <p className="p-6 text-chalk/60">Chargement…</p>
  if (!profil) return <p className="p-6">Connectez-vous pour voir les matchs qui vous sont assignés.</p>

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Mes matchs</h1>
          <p className="text-sm text-chalk/55">{profil.nom}</p>
        </div>
        <button className="text-sm text-chalk/60 underline" onClick={deconnexion}>Se déconnecter</button>
      </header>

      {matchs.length === 0 ? (
        <p className="text-chalk/60">
          Aucun match ne vous est assigné pour l'instant. L'organisateur vous en attribuera un
          depuis sa console — revenez ici une fois prévenu.
        </p>
      ) : (
        <ul className="space-y-2">
          {matchs.map(m => {
            const dom = equipes[m.equipe_dom]
            const ext = equipes[m.equipe_ext]
            return (
              <li key={m.id}>
                <Link to={`/console/${m.id}`} className="board flex items-center gap-3 p-3 hover:border-flame/50">
                  {dom && <Blason equipe={dom} taille={28} />}
                  <span className="min-w-0 flex-1 truncate">{dom?.nom ?? '…'} — {ext?.nom ?? '…'}</span>
                  {m.terrain && <span className="text-xs text-chalk/45">{m.terrain}</span>}
                  <span className={`text-xs ${m.statut === 'en_cours' ? 'text-flame' : 'text-chalk/50'}`}>
                    {LIBELLE_STATUT[m.statut]}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}