/** Dictée via l'API Web Speech (Chrome / Edge Android). */
type Resultat = (texte: string, definitif: boolean) => void

export function dicteeDisponible() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

export function ecouter(onResultat: Resultat, onFin?: () => void) {
  const Reco = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  if (!Reco) throw new Error("La dictée n'est pas disponible sur ce navigateur.")
  const reco = new Reco()
  reco.lang = 'fr-FR'
  reco.continuous = false
  reco.interimResults = true
  reco.onresult = (e: any) => {
    const dernier = e.results[e.results.length - 1]
    onResultat(dernier[0].transcript as string, dernier.isFinal as boolean)
  }
  reco.onend = () => onFin?.()
  reco.start()
  return () => reco.stop()
}
