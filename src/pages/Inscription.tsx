/**
 * Inscription d'un club : identité, couleurs, puis effectif photo par photo.
 * Contrôle anti-double-inscription avant le dépôt du dossier.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { blasonDataURL } from '@/lib/blason'
import { verifierVisage } from '@/lib/ia'
import { REGLES } from '@/lib/rules'
import type { MemberRole } from '@/lib/types'

type Brouillon = { nom: string; role: MemberRole; fichier: File; apercu: string }
const ROLES: MemberRole[] = ['joueur', 'entraineur', 'president']

export default function Inscription() {
  const naviguer = useNavigate()
  const [nom, setNom] = useState('')
  const [quartier, setQuartier] = useState('')
  const [primaire, setPrimaire] = useState('#0B3B2E')
  const [secondaire, setSecondaire] = useState('#FF6B1A')
  const [membres, setMembres] = useState<Brouillon[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const apercus = useRef<string[]>([])

  const joueurs = membres.filter(m => m.role === 'joueur').length

  useEffect(() => { apercus.current = membres.map(m => m.apercu) }, [membres])
  useEffect(() => () => { apercus.current.forEach(url => URL.revokeObjectURL(url)) }, [])

  async function ajouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nomMembre = String(form.get('nom') ?? '').trim()
    const role = form.get('role') as MemberRole
    const fichier = form.get('photo') as File

    if (!nomMembre || !fichier?.size) return setErreur('Le nom ou surnom et la photo sont obligatoires.')
    if (!ROLES.includes(role)) return setErreur('Rôle invalide.')
    if (role === 'joueur' && joueurs >= REGLES.maxJoueurs) return setErreur(`L'effectif est complet : ${REGLES.maxJoueurs} joueurs maximum.`)
    if (role !== 'joueur' && membres.some(m => m.role === role)) return setErreur('Ce rôle est déjà occupé dans le club.')

    setErreur(null)
    setMembres(l => [...l, { nom: nomMembre, role, fichier, apercu: URL.createObjectURL(fichier) }])
    e.currentTarget.reset()
  }

  async function envoyer() {
    if (!nom.trim()) return setErreur("Donnez un nom au club.")
    if (membres.length === 0) return setErreur('Ajoutez au moins un membre.')
    setEnvoi(true); setErreur(null)

    try {
      const { data: tournoi, error: eTournoi } = await supabase.from('tournois').select('id').eq('actif', true).limit(1).single()
      if (eTournoi || !tournoi) throw new Error("Aucun tournoi actif n'est configuré.")

      for (const m of membres) {
        try {
          const base64 = await new Promise<string>(res => {
            const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]!); fr.readAsDataURL(m.fichier)
          })
          const r = await verifierVisage(base64, tournoi.id)
          if (r.doublon) throw new Error(`${m.nom} est déjà inscrit dans le tournoi sous une autre identité.`)
        } catch (e) {
          if ((e as Error).message.includes('déjà inscrit')) throw e
        }
      }

      const { data: equipe, error } = await supabase.from('equipes').insert({
        tournoi_id: tournoi.id, nom: nom.trim(), quartier: quartier.trim() || null,
        couleur_primaire: primaire, couleur_secondaire: secondaire
      }).select().single()
      if (error || !equipe) throw error ?? new Error("Impossible de créer le dossier d'inscription.")

      for (const m of membres) {
        const nomFichier = m.fichier.name.replace(/[^\w.-]+/g, '-')
        const chemin = `${equipe.id}/${crypto.randomUUID()}-${nomFichier}`
        const { error: eUp } = await supabase.storage.from('photos').upload(chemin, m.fichier)
        if (eUp) throw eUp
        const { data: pub } = supabase.storage.from('photos').getPublicUrl(chemin)

        const { error: eM } = await supabase.from('membres').insert({
          equipe_id: equipe.id, nom: m.nom, role: m.role, photo_url: pub.publicUrl
        })
        if (eM) throw eM
      }
      naviguer(`/equipe/${equipe.id}`)
    } catch (e) {
      setErreur((e as Error).message)
    } finally { setEnvoi(false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <h1 className="font-display text-3xl">Inscrire un club</h1>

      <section className="board space-y-4 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-3">
            <div><label className="label" htmlFor="c-nom">Nom du club</label>
              <input id="c-nom" className="field" value={nom} onChange={e => setNom(e.target.value)} placeholder="Les Éléphants de Yop" /></div>
            <div><label className="label" htmlFor="c-q">Quartier</label>
              <input id="c-q" className="field" value={quartier} onChange={e => setQuartier(e.target.value)} placeholder="Yopougon" /></div>
            <div className="flex gap-3">
              <div><label className="label" htmlFor="c1">Couleur principale</label>
                <input id="c1" type="color" className="h-10 w-16 rounded bg-transparent" value={primaire} onChange={e => setPrimaire(e.target.value)} /></div>
              <div><label className="label" htmlFor="c2">Couleur secondaire</label>
                <input id="c2" type="color" className="h-10 w-16 rounded bg-transparent" value={secondaire} onChange={e => setSecondaire(e.target.value)} /></div>
            </div>
          </div>
          <figure className="text-center">
            <img src={blasonDataURL(nom || '??', primaire, secondaire)} alt="" width={84} />
            <figcaption className="mt-1 text-xs text-chalk/50">Blason généré</figcaption>
          </figure>
        </div>
      </section>

      <section className="board space-y-4 p-4">
        <h2 className="font-display text-xl">Effectif — {joueurs}/{REGLES.maxJoueurs} joueurs</h2>
        <p className="text-sm text-chalk/60">
          Un joueur est identifié par son nom ou son surnom de quartier. La photo sert à éditer sa licence.
        </p>
        <form onSubmit={ajouter} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div><label className="label" htmlFor="m-nom">Nom ou surnom</label>
            <input id="m-nom" name="nom" className="field" placeholder="Zico" /></div>
          <div><label className="label" htmlFor="m-role">Rôle</label>
            <select id="m-role" name="role" className="field">
              <option value="joueur">Joueur</option>
              <option value="entraineur">Entraîneur</option>
              <option value="president">Président</option>
            </select></div>
          <div><label className="label" htmlFor="m-photo">Photo</label>
            <input id="m-photo" name="photo" type="file" accept="image/*" capture="user" className="field" /></div>
          <button className="btn-ghost">Ajouter</button>
        </form>

        {membres.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {membres.map((m, i) => (
              <li key={i} className="relative overflow-hidden rounded-lg border border-white/10">
                <img src={m.apercu} alt="" className="h-24 w-full object-cover" />
                <span className="block truncate px-1.5 py-1 text-sm">{m.nom}</span>
                <button onClick={() => setMembres(l => {
                  const apercu = l[i]?.apercu
                  if (apercu) URL.revokeObjectURL(apercu)
                  return l.filter((_, j) => j !== i)
                })}
                  className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-sm" aria-label={`Retirer ${m.nom}`}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {erreur && <p className="rounded-lg border border-rouge/60 bg-rouge/10 px-3 py-2 text-sm">{erreur}</p>}

      <button className="btn-primary w-full" onClick={envoyer} disabled={envoi}>
        {envoi ? 'Envoi du dossier…' : "Envoyer l'inscription"}
      </button>
    </div>
  )
}
