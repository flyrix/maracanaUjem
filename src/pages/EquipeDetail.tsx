import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Blason } from '@/components/Blason'
import { genererPlancheLicences, telecharger } from '@/lib/licences'
import { useAuth } from '@/hooks/useAuth'
import type { Equipe, Membre, Tournoi } from '@/lib/types'

export default function EquipeDetail() {
  const { id } = useParams()
  const { estAdmin } = useAuth()
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [membres, setMembres] = useState<Membre[]>([])
  const [tournoi, setTournoi] = useState<Tournoi | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const { data: eq } = await supabase.from('equipes').select('*').eq('id', id).single()
      setEquipe(eq as Equipe)
      const tableMembres = estAdmin ? 'membres' : 'v_membres_public'
      const [{ data: mb }, { data: tn }] = await Promise.all([
        supabase.from(tableMembres).select('*').eq('equipe_id', id).order('role'),
        supabase.from('tournois').select('*').eq('id', (eq as Equipe).tournoi_id).single()
      ])
      setMembres((mb as Membre[]) ?? [])
      setTournoi(tn as Tournoi)
    })()
  }, [id, estAdmin])

  async function exporter() {
    if (!equipe || !tournoi) return
    if (membres.some(m => !m.qr_token)) return
    setEnCours(true)
    try {
      const blob = await genererPlancheLicences(tournoi, equipe, membres)
      telecharger(blob, `licences-${equipe.nom.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } finally { setEnCours(false) }
  }

  if (!equipe) return <p className="p-6 text-chalk/60">Chargement du club…</p>

  const parRole = (r: Membre['role']) => membres.filter(m => m.role === r)
  const peutExporter = estAdmin && membres.length > 0 && membres.every(m => m.qr_token)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-4">
        <Blason equipe={equipe} taille={64} />
        <div>
          <h1 className="font-display text-3xl leading-tight">{equipe.nom}</h1>
          <p className="text-chalk/55">{equipe.quartier ?? '—'} · {membres.length} membres</p>
        </div>
      </header>

      {estAdmin && (
        <button className="btn-primary" onClick={exporter} disabled={enCours || !peutExporter}>
          <FileDown size={20} />{enCours ? 'Génération…' : 'Éditer les licences PDF'}
        </button>
      )}

      {(['joueur', 'entraineur', 'president'] as const).map(role => {
        const liste = parRole(role)
        if (liste.length === 0) return null
        const titre = { joueur: 'Effectif', entraineur: 'Entraîneur', president: 'Président' }[role]
        return (
          <section key={role}>
            <h2 className="mb-2 font-display text-xl">{titre}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {liste.map(m => (
                <li key={m.id} className="board overflow-hidden">
                  <img src={m.photo_url} alt="" className="h-28 w-full object-cover" />
                  <span className="block truncate px-2 py-1.5 font-display text-lg">{m.nom}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
