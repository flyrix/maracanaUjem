/**
 * Console table de marque.
 * Grands boutons, une main, plein soleil : chaque action est écrite
 * d'abord en local puis poussée vers le serveur.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Mic, Play, Pause, Undo2, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMatchLive } from '@/hooks/useMatchLive'
import { useChrono } from '@/hooks/useChrono'
import { useAuth } from '@/hooks/useAuth'
import { useOutboxMatch } from '@/hooks/useOutboxMatch'
import { Tableau } from '@/components/Tableau'
import { BandeauSynchro } from '@/components/BandeauSynchro'
import { enregistrerEvenement, annulerEvenement, enregistrerMajMatch } from '@/lib/sync'
import { db, mettreEnCache } from '@/lib/db'
import { REGLES, finExclusion } from '@/lib/rules'
import { minuteDeJeu } from '@/lib/format'
import { analyserDictee } from '@/lib/ia'
import { dicteeDisponible, ecouter } from '@/lib/voix'
import { resumerMatch, type StyleResume } from '@/lib/ia'
import type { Equipe, Evenement, EventType, Match, Membre } from '@/lib/types'

type Action = Extract<EventType, 'but' | 'carton_jaune' | 'carton_rouge' | 'carton_bleu'>

const ACTIONS: Array<{ type: Action; libelle: string; classe: string }> = [
  { type: 'but',          libelle: 'But',          classe: 'bg-flame text-ink' },
  { type: 'carton_jaune', libelle: 'Carton jaune', classe: 'bg-jaune text-ink' },
  { type: 'carton_bleu',  libelle: 'Carton bleu',  classe: 'bg-bleu text-white' },
  { type: 'carton_rouge', libelle: 'Carton rouge', classe: 'bg-rouge text-white' }
]

export default function ConsolePCO() {
  const { id } = useParams()
  const { profil, chargement, estPCO } = useAuth()
  const { match: matchDistant, evenements } = useMatchLive(id)
  const [matchCache, setMatchCache] = useState<Match | null>(null)
  const [matchLocal, setMatchLocal] = useState<Match | null>(null)
  const match = matchLocal ?? matchDistant ?? matchCache
  const secondes = useChrono(match)
  const { evenements: evenementsLocaux, suppressions } = useOutboxMatch(id)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [action, setAction] = useState<Action | null>(null)
  const [ecoute, setEcoute] = useState(false)
  const [dictee, setDictee] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!matchDistant) return
    ;(async () => {
      const ids = [matchDistant.equipe_dom, matchDistant.equipe_ext]
      const [e, m] = await Promise.all([
        supabase.from('equipes').select('*').in('id', ids),
        supabase.from('membres').select('*').in('equipe_id', ids).eq('role', 'joueur')
      ])
      const eq = (e.data as Equipe[]) ?? []
      const mb = (m.data as Membre[]) ?? []
      setEquipes(eq); setMembres(mb)
      setMatchCache(matchDistant)
      setMatchLocal(null)
      await mettreEnCache(matchDistant, eq, mb)      // le match reste jouable sans réseau
    })()
  }, [matchDistant?.id])

  useEffect(() => {
    if (!id || matchDistant) return
    let vivant = true
    ;(async () => {
      const cached = await db.matchs.get(id)
      if (!cached || !vivant) return
      setMatchCache(cached)
      const ids = [cached.equipe_dom, cached.equipe_ext]
      const [eq, mb] = await Promise.all([
        db.equipes.where('id').anyOf(ids).toArray(),
        db.membres.where('equipe_id').anyOf(ids).toArray()
      ])
      if (!vivant) return
      setEquipes(eq)
      setMembres(mb.filter(m => m.role === 'joueur'))
    })()
    return () => { vivant = false }
  }, [id, matchDistant])

  const dom = equipes.find(e => e.id === match?.equipe_dom)
  const ext = equipes.find(e => e.id === match?.equipe_ext)
  const surnoms = useMemo(() => membres.map(m => m.nom), [membres])

  useEffect(() => {
    if (matchDistant && matchLocal?.id === matchDistant.id) setMatchLocal(null)
  }, [
    matchDistant?.chrono_demarre_a,
    matchDistant?.chrono_offset_sec,
    matchDistant?.resume_ia,
    matchDistant?.score_dom,
    matchDistant?.score_ext,
    matchDistant?.statut
  ])

  const evenementsVisibles = useMemo(() => {
    const supprimes = new Set(suppressions.map(s => s.client_uuid))
    const serveur = evenements.filter(e => !supprimes.has(e.client_uuid))
    const connus = new Set(serveur.map(e => e.client_uuid))
    const locaux = evenementsLocaux
      .filter(e => !supprimes.has(e.client_uuid) && !connus.has(e.client_uuid))
      .map(e => ({ ...e, id: e.client_uuid } as Evenement))
    return [...serveur, ...locaux]
      .sort((a, b) => new Date(a.cree_le).getTime() - new Date(b.cree_le).getTime())
  }, [evenements, evenementsLocaux, suppressions])

  const matchAffiche = useMemo(() => {
    if (!match) return null
    const connus = new Set(evenements.map(e => e.client_uuid))
    const supprimes = new Set(suppressions.map(s => s.client_uuid))
    const butsLocaux = evenementsLocaux.filter(e => e.type === 'but' && !connus.has(e.client_uuid) && !supprimes.has(e.client_uuid))
    const butsSupprimes = evenements.filter(e => e.type === 'but' && supprimes.has(e.client_uuid))
    return {
      ...match,
      score_dom: Math.max(0, match.score_dom
        + butsLocaux.filter(e => e.equipe_id === match.equipe_dom).length
        - butsSupprimes.filter(e => e.equipe_id === match.equipe_dom).length),
      score_ext: Math.max(0, match.score_ext
        + butsLocaux.filter(e => e.equipe_id === match.equipe_ext).length
        - butsSupprimes.filter(e => e.equipe_id === match.equipe_ext).length)
    }
  }, [evenements, evenementsLocaux, match, suppressions])

  async function chronometre(demarrer: boolean) {
    if (!match) return
    const patch = demarrer
      ? { statut: 'en_cours' as const, chrono_demarre_a: new Date().toISOString() }
      : { statut: 'pause' as const, chrono_demarre_a: null, chrono_offset_sec: secondes }
    setMatchLocal({ ...match, ...patch })
    await enregistrerMajMatch(match.id, patch)
  }

  async function terminer() {
    if (!match) return
    const patch = { statut: 'termine' as const, chrono_demarre_a: null, chrono_offset_sec: secondes }
    setMatchLocal({ ...match, ...patch })
    await enregistrerMajMatch(match.id, patch)
  }

  async function saisir(type: Action, membre: Membre, source: 'tactile' | 'vocal' = 'tactile') {
    if (!match) return
    const maintenant = new Date()
    await enregistrerEvenement({
      match_id: match.id,
      equipe_id: membre.equipe_id,
      membre_id: membre.id,
      type,
      minute: minuteDeJeu(secondes),
      chrono_sec: secondes,
      expire_a: type === 'carton_bleu' ? finExclusion(maintenant, REGLES.cartonBleuSecondes).toISOString() : null,
      source,
      client_uuid: crypto.randomUUID(),
      cree_le: maintenant.toISOString(),
      synchronise: 0
    })
    setAction(null)
    setMessage(`${type === 'but' ? 'But' : 'Sanction'} enregistré pour ${membre.nom}.`)
    setTimeout(() => setMessage(null), 2500)
  }

  function dicter() {
    if (!dicteeDisponible()) return setMessage("La dictée n'est pas disponible sur ce navigateur.")
    setEcoute(true); setDictee('')
    ecouter(async (texte, definitif) => {
      setDictee(texte)
      if (!definitif) return
      const intention = await analyserDictee(texte, surnoms)
      if (!intention.type || !intention.cible) return setMessage(`Phrase non comprise : « ${texte} »`)
      const cible = intention.cible.toLowerCase()
      const joueur = membres.find(m => m.nom.toLowerCase().includes(cible) || cible.includes(m.nom.toLowerCase()))
      if (!joueur) return setMessage(`Aucun joueur ne correspond à « ${intention.cible} ».`)
      await saisir(intention.type, joueur, 'vocal')
    }, () => setEcoute(false))
  }

  async function redigerResume(style: StyleResume) {
    if (!matchAffiche || !dom || !ext) return
    setMessage('Rédaction du compte-rendu…')
    try {
      const texte = await resumerMatch(matchAffiche, { dom: dom.nom, ext: ext.nom }, evenementsVisibles, style)
      await supabase.from('matchs').update({ resume_ia: texte, resume_ia_style: style }).eq('id', matchAffiche.id)
      setMessage('Compte-rendu publié.')
    } catch (e) {
      setMessage(String((e as Error).message))
    }
  }

  if (!matchAffiche || !dom || !ext) return <p className="p-6 text-chalk/60">Chargement de la console…</p>
  if (chargement) return <p className="p-6 text-chalk/60">Vérification de l'accès…</p>
  if (!estPCO) return <p className="p-6">Connectez-vous avec un compte table de marque pour ouvrir cette console.</p>
  if (!matchAffiche.pco_id && profil?.role !== 'super_admin')
    return <p className="p-6">Ce match n'a pas encore de table de marque assignée.</p>
  if (matchAffiche.pco_id && profil && matchAffiche.pco_id !== profil.id && profil.role !== 'super_admin')
    return <p className="p-6">Ce match est assigné à une autre table de marque.</p>

  const dernier = evenementsVisibles[evenementsVisibles.length - 1]

  return (
    <div className="pb-24">
      <BandeauSynchro />
      <div className="space-y-4 p-4">
        <Tableau match={matchAffiche} dom={dom} ext={ext} secondes={secondes} />

        <div className="grid grid-cols-3 gap-2">
          {matchAffiche.statut === 'en_cours'
            ? <button className="btn-ghost" onClick={() => chronometre(false)}><Pause size={20} />Pause</button>
            : <button className="btn-primary" onClick={() => chronometre(true)}><Play size={20} />Lancer</button>}
          <button className="btn-ghost" onClick={dicter} disabled={ecoute}>
            <Mic size={20} />{ecoute ? 'Écoute…' : 'Dicter'}
          </button>
          <button className="btn-ghost" onClick={terminer}><Flag size={20} />Fin</button>
        </div>

        {ecoute && <p className="text-sm text-chalk/60">« {dictee || 'Dites : but de Zico, carton bleu pour Lolo…'} »</p>}
        {message && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm">{message}</p>}

        {!action ? (
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map(a => (
              <button key={a.type} onClick={() => setAction(a.type)}
                className={`${a.classe} rounded-xl py-8 font-display text-2xl uppercase shadow-board`}>
                {a.libelle}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Qui ? — {ACTIONS.find(a => a.type === action)!.libelle}</h2>
              <button className="text-chalk/60 underline" onClick={() => setAction(null)}>Annuler</button>
            </div>
            {[dom, ext].map(eq => (
              <div key={eq.id}>
                <p className="mb-1.5 text-sm text-chalk/55">{eq.nom}</p>
                <div className="grid grid-cols-2 gap-2">
                  {membres.filter(m => m.equipe_id === eq.id).map(m => (
                    <button key={m.id} onClick={() => saisir(action, m)}
                      className="rounded-lg border border-white/15 px-3 py-5 text-left font-display text-xl hover:border-flame">
                      {m.nom}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dernier && (
          <button className="btn-ghost w-full" onClick={() => annulerEvenement(dernier.client_uuid, dernier.match_id)}>
            <Undo2 size={18} />Annuler le dernier fait de jeu
          </button>
        )}

        {matchAffiche.statut === 'termine' && (
          <div className="board space-y-3 p-4">
            <h2 className="font-display text-xl">Compte-rendu du match</h2>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => redigerResume('professionnel')}>Ton classique</button>
              <button className="btn-ghost flex-1" onClick={() => redigerResume('nouchi')}>Ton du quartier</button>
            </div>
            {matchAffiche.resume_ia && <p className="whitespace-pre-line text-chalk/85">{matchAffiche.resume_ia}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
