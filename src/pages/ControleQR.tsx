/** Contrôle d'avant-match : le PCO scanne la licence, la base répond. */
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Equipe, Membre } from '@/lib/types'

type Verdict = { ok: boolean; texte: string; membre?: Membre; equipe?: Equipe }

export default function ControleQR() {
  const zone = useRef<HTMLDivElement>(null)
  const { chargement, estPCO } = useAuth()
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (chargement || !estPCO) return
    const scanner = new Html5Qrcode('zone-scan')
    scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, async texte => {
        const token = texte.replace('maracana:membre:', '')
        const { data } = await supabase.from('membres').select('*, equipes(*)').eq('qr_token', token).maybeSingle()
        if (!data) return setVerdict({ ok: false, texte: 'Licence inconnue. Ce QR ne correspond à aucun membre du tournoi.' })
        const membre = data as unknown as Membre & { equipes: Equipe }
        setVerdict(
          membre.actif
            ? { ok: true, texte: 'Licence valide.', membre, equipe: membre.equipes }
            : { ok: false, texte: 'Licence suspendue. Ce joueur ne peut pas entrer sur le terrain.', membre, equipe: membre.equipes }
        )
      }, () => {})
      .catch(() => setErreur("Impossible d'ouvrir la caméra. Autorisez l'accès puis rechargez la page."))
    return () => { scanner.stop().catch(() => {}) }
  }, [chargement, estPCO])

  if (chargement) return <p className="p-6 text-chalk/60">Vérification de l'accès…</p>
  if (!estPCO) return <p className="p-6">Connectez-vous avec un compte table de marque pour contrôler les licences.</p>

  return (
    <div className="space-y-4 p-4">
      <h1 className="font-display text-3xl">Contrôle des licences</h1>
      <div id="zone-scan" ref={zone} className="overflow-hidden rounded-xl border border-white/15" />
      {erreur && <p className="text-rouge">{erreur}</p>}
      {verdict && (
        <div className={`board flex items-center gap-4 p-4 ${verdict.ok ? 'border-flame' : 'border-rouge'}`}>
          {verdict.membre && <img src={verdict.membre.photo_url} alt="" className="h-20 w-16 rounded object-cover" />}
          <div>
            <p className="font-display text-2xl">{verdict.membre?.nom ?? 'Inconnu'}</p>
            <p className="text-sm text-chalk/60">{verdict.equipe?.nom}</p>
            <p className={`mt-1 ${verdict.ok ? 'text-flame' : 'text-rouge'}`}>{verdict.texte}</p>
          </div>
        </div>
      )}
    </div>
  )
}
