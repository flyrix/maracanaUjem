import { useSynchro } from '@/hooks/useSynchro'

/** Dit au scripteur ce qui n'est pas encore parti, sans l'inquiéter pour rien. */
export function BandeauSynchro() {
  const { enAttente, enLigne } = useSynchro()
  if (enLigne && enAttente === 0) return null
  return (
    <div className={`px-4 py-2 text-sm ${enLigne ? 'bg-flame/20 text-flame' : 'bg-black/40 text-chalk/80'}`}>
      {enLigne
        ? `Synchronisation en cours — ${enAttente} opération${enAttente > 1 ? 's' : ''} à envoyer.`
        : `Hors-ligne. Le match continue : ${enAttente} opération${enAttente > 1 ? 's' : ''} sera envoyée${enAttente > 1 ? 's' : ''} au retour du réseau.`}
    </div>
  )
}
