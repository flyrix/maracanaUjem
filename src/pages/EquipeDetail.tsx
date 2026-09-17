import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileDown, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Blason } from '@/components/Blason'
import { genererPlancheLicences, telecharger } from '@/lib/licences'
import { useAuth } from '@/hooks/useAuth'
import { REGLES } from '@/lib/rules'
import type { Equipe, Membre, Tournoi } from '@/lib/types'

export default function EquipeDetail() {
  const { id } = useParams()
  const { estAdmin } = useAuth()
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [membres, setMembres] = useState<Membre[]>([])
  const [tournoi, setTournoi] = useState<Tournoi | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [ajout, setAjout] = useState(false)
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const [roleChoisi, setRoleChoisi] = useState<Membre['role']>('joueur')

  async function recharger() {
    if (!id) return
    const { data: mb } = await supabase.from('membres').select('*').eq('equipe_id', id).order('role')
    setMembres((mb as Membre[]) ?? [])
  }

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const { data: eq } = await supabase.from('equipes').select('*').eq('id', id).single()
      setEquipe(eq as Equipe)
      const [{ data: mb }, { data: tn }] = await Promise.all([
        supabase.from('membres').select('*').eq('equipe_id', id).order('role'),
        supabase.from('tournois').select('*').eq('id', (eq as Equipe).tournoi_id).single()
      ])
      setMembres((mb as Membre[]) ?? [])
      setTournoi(tn as Tournoi)
    })()
  }, [id])

  async function exporter() {
    if (!equipe || !tournoi) return
    setEnCours(true)
    try {
      const blob = await genererPlancheLicences(tournoi, equipe, membres)
      telecharger(blob, `licences-${equipe.nom.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } finally { setEnCours(false) }
  }

  async function ajouterMembre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!equipe) return
    const f = new FormData(e.currentTarget)
    const nom = String(f.get('nom') ?? '').trim()
    const role = f.get('role') as Membre['role']
    const mercenaire = role === 'joueur' && f.get('mercenaire') === 'on'
    const fichier = f.get('photo') as File

    if (!nom || !fichier?.size) return setErreurAjout('Le nom ou surnom et la photo sont obligatoires.')
    setErreurAjout(null); setAjout(true)
    try {
      const chemin = `${equipe.id}/${crypto.randomUUID()}-${fichier.name}`
      const { error: eUp } = await supabase.storage.from('photos').upload(chemin, fichier)
      if (eUp) throw eUp
      const { data: pub } = supabase.storage.from('photos').getPublicUrl(chemin)

      const { error } = await supabase.from('membres').insert({
        equipe_id: equipe.id, nom, role, photo_url: pub.publicUrl, est_mercenaire: mercenaire
      })
      if (error) throw error

      e.currentTarget.reset()
      setRoleChoisi('joueur')
      await recharger()
    } catch (err) {
      // Le trigger `verifier_effectif` refuse l'ajout au-delà des quotas du règlement.
      setErreurAjout((err as Error).message)
    } finally {
      setAjout(false)
    }
  }

  if (!equipe) return <p className="p-6 text-chalk/60">Chargement du club…</p>

  const parRole = (r: Membre['role']) => membres.filter(m => m.role === r)
  const titulaires = membres.filter(m => m.role === 'joueur' && !m.est_mercenaire).length
  const mercenaires = membres.filter(m => m.role === 'joueur' && m.est_mercenaire).length
  const phaseOuverte = tournoi?.phase_poules_ouverte ?? true
  const mercenaireDisponible = phaseOuverte && mercenaires < REGLES.maxMercenaires

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
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exporter} disabled={enCours || membres.length === 0}>
            <FileDown size={20} />{enCours ? 'Génération…' : 'Éditer les licences PDF'}
          </button>
        </div>
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
                <li key={m.id} className="board relative overflow-hidden">
                  <img src={m.photo_url} alt="" className="h-28 w-full object-cover" />
                  {m.est_mercenaire && (
                    <span className="absolute right-1 top-1 rounded bg-bleu px-1.5 py-0.5 text-[10px] uppercase">
                      Mercenaire
                    </span>
                  )}
                  <span className="block truncate px-2 py-1.5 font-display text-lg">{m.nom}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {membres.length === 0 && (
        <p className="text-chalk/60">
          Aucun membre enregistré pour l'instant. Sans joueur, la table de marque n'aura personne à sélectionner.
        </p>
      )}

      {estAdmin && (
        <section className="board space-y-3 p-4">
          <h2 className="font-display text-xl">
            Ajouter un membre — {titulaires}/{REGLES.maxJoueurs} joueurs · {mercenaires}/{REGLES.maxMercenaires} mercenaires
          </h2>
          <form onSubmit={ajouterMembre} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
            <div><label className="label" htmlFor="a-nom">Nom ou surnom</label>
              <input id="a-nom" name="nom" className="field" placeholder="Zico" /></div>
            <div><label className="label" htmlFor="a-role">Rôle</label>
              <select id="a-role" name="role" className="field"
                value={roleChoisi} onChange={e => setRoleChoisi(e.target.value as Membre['role'])}>
                <option value="joueur">Joueur</option>
                <option value="entraineur">Entraîneur</option>
                <option value="president">Président</option>
              </select></div>
            <div><label className="label" htmlFor="a-photo">Photo</label>
              <input id="a-photo" name="photo" type="file" accept="image/*" capture="user" className="field" /></div>
            <button className="btn-ghost" disabled={ajout}>
              <UserPlus size={18} />{ajout ? 'Ajout…' : 'Ajouter'}
            </button>

            {roleChoisi === 'joueur' && (
              <label className="flex items-center gap-2 text-sm text-chalk/75 sm:col-span-4">
                <input type="checkbox" name="mercenaire" disabled={!mercenaireDisponible} />
                Mercenaire
                <span className="text-chalk/45">
                  {!phaseOuverte
                    ? '— la phase de poules est terminée, plus aucun mercenaire accepté.'
                    : mercenaires >= REGLES.maxMercenaires
                    ? `— quota de ${REGLES.maxMercenaires} déjà atteint pour ce club.`
                    : `— ${REGLES.maxMercenaires - mercenaires} place(s) restante(s), pendant la phase de poules uniquement.`}
                </span>
              </label>
            )}
          </form>
          {erreurAjout && <p className="text-sm text-rouge">{erreurAjout}</p>}
        </section>
      )}
    </div>
  )
}