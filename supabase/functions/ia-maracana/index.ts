// Edge Function Supabase (Deno) — agent IA du tournoi.
// Déploiement :  supabase functions deploy ia-maracana
// Secrets     :  supabase secrets set GEMINI_API_KEY=...
//
// Le front n'appelle jamais le modèle directement : la clé reste ici.

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const MODELE = 'gemini-2.0-flash'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const CONSIGNES: Record<string, string> = {
  resume: `Tu es le reporter officiel d'un tournoi de maracana "Petit Poteau" en Côte d'Ivoire.
Rédige un compte-rendu de 120 mots maximum à partir du score et de la liste d'événements.
Les joueurs sont désignés par leur surnom de quartier. Ne parle jamais de passe décisive :
cette statistique n'existe pas dans ce tournoi. Un carton bleu est une exclusion temporaire de 2 minutes.`,
  chatbot: `Tu réponds aux supporters d'un tournoi de maracana. Sois bref, concret et chaleureux.
Réponds uniquement à partir du contexte fourni ; si l'information manque, dis-le simplement.`,
  intention_vocale: `Tu convertis une phrase dictée par la table de marque en événement de jeu.
Réponds UNIQUEMENT par du JSON : {"type":"but|carton_jaune|carton_rouge|carton_bleu|null","cible":"surnom ou null","confiance":0..1}.
"cible" doit correspondre au surnom le plus proche de la liste fournie.`
}

const STYLES: Record<string, string> = {
  professionnel: "Ton journalistique sobre, à la manière d'un compte-rendu de presse sportive.",
  nouchi: "Ton local ivoirien, chaleureux et imagé, avec quelques expressions nouchi accessibles. Reste respectueux."
}

async function gemini(consigne: string, entree: string) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY non configurée.')
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: consigne }] },
        contents: [{ role: 'user', parts: [{ text: entree }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      })
    }
  )
  if (!r.ok) {
    const detail = await r.text()
    throw new Error(`Gemini indisponible (${r.status}) ${detail.slice(0, 160)}`)
  }
  const data = await r.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { tache, donnees } = await req.json()

    if (tache === 'resume') {
      const consigne = `${CONSIGNES.resume}\n${STYLES[donnees.style] ?? STYLES.professionnel}`
      const texte = await gemini(consigne, JSON.stringify(donnees))
      return new Response(JSON.stringify({ texte }), { headers: CORS })
    }

    if (tache === 'chatbot') {
      const texte = await gemini(CONSIGNES.chatbot, JSON.stringify(donnees))
      return new Response(JSON.stringify({ texte }), { headers: CORS })
    }

    if (tache === 'intention_vocale') {
      const brut = await gemini(CONSIGNES.intention_vocale, JSON.stringify(donnees))
      const json = brut.replace(/```json|```/g, '').trim()
      return new Response(json || '{"type":null,"cible":null,"confiance":0}', { headers: CORS })
    }

    if (tache === 'verifier_visage') {
      // Comparaison faciale : voir docs/ANTI_FRAUDE.md pour le branchement
      // du service de vectorisation (embedding) et le seuil de décision.
      return new Response(JSON.stringify({ doublon: false, motif: 'non_configure' }), { headers: CORS })
    }

    return new Response(JSON.stringify({ erreur: 'Tâche inconnue' }), { status: 400, headers: CORS })
  } catch (e) {
    return new Response(JSON.stringify({ erreur: String(e) }), { status: 500, headers: CORS })
  }
})
