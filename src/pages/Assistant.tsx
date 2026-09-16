/** Chatbot supporters : horaires, Soulier d'Or, parcours d'une équipe. */
import { useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { demanderAuChatbot } from '@/lib/ia'

type Bulle = { de: 'moi' | 'assistant'; texte: string }

const SUGGESTIONS = [
  'À quelle heure joue Abobo Stars ?',
  "Qui est en tête du Soulier d'Or ?",
  'Quels matchs sont terminés aujourd’hui ?'
]

export default function Assistant() {
  const [fil, setFil] = useState<Bulle[]>([])
  const [saisie, setSaisie] = useState('')
  const [attente, setAttente] = useState(false)

  async function envoyer(question: string) {
    if (!question.trim()) return
    setFil(f => [...f, { de: 'moi', texte: question }])
    setSaisie(''); setAttente(true)
    try {
      const [matchs, buteurs, equipes] = await Promise.all([
        supabase.from('matchs').select('*').limit(40),
        supabase.from('v_soulier_or').select('*').limit(10),
        supabase.from('equipes').select('id, nom, quartier')
      ])
      const texte = await demanderAuChatbot(question, {
        matchs: matchs.data, soulier_or: buteurs.data, equipes: equipes.data,
        maintenant: new Date().toISOString()
      })
      setFil(f => [...f, { de: 'assistant', texte }])
    } catch (e) {
      setFil(f => [...f, { de: 'assistant', texte: (e as Error).message }])
    } finally { setAttente(false) }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col p-4">
      <h1 className="mb-3 font-display text-3xl">Assistant du tournoi</h1>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {fil.length === 0 && (
          <div className="space-y-2">
            <p className="text-chalk/60">Posez votre question sur les matchs, les buteurs ou une équipe.</p>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => envoyer(s)} className="block w-full rounded-lg border border-white/15 px-3 py-2 text-left hover:border-flame">
                {s}
              </button>
            ))}
          </div>
        )}
        {fil.map((b, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-xl px-3.5 py-2.5 ${
            b.de === 'moi' ? 'ml-auto bg-flame text-ink' : 'bg-white/8'}`}>{b.texte}</p>
        ))}
        {attente && <p className="text-chalk/50">L'assistant consulte les données du tournoi…</p>}
      </div>

      <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); envoyer(saisie) }}>
        <input className="field" value={saisie} onChange={e => setSaisie(e.target.value)} placeholder="Votre question" aria-label="Votre question" />
        <button className="btn-primary" disabled={attente} aria-label="Envoyer"><Send size={20} /></button>
      </form>
    </div>
  )
}
