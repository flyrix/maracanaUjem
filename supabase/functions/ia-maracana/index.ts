// Edge Function Supabase (Deno) — agent IA du tournoi.
// Déploiement :  supabase functions deploy ia-maracana
// Secrets     :  supabase secrets set GEMINI_API_KEY=...
//               supabase secrets set GEMINI_MODEL=gemini-2.5-flash

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const MODELE = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'

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
  
  chatbot: `Tu réponds aux supporters d'un tournoi de maracana "Petit Poteau".
Sois bref, concret, complet et chaleureux.
Réponds uniquement à partir du contexte fourni (matchs, classement du Soulier d'Or, équipes).
Si l'information manque dans le contexte, dis-le simplement et poliment. Ne laisse jamais une phrase incomplète.`,

  intention_vocale: `Tu convertis une phrase dictée par la table de marque en événement de jeu.
Réponds UNIQUEMENT par du JSON structuré comme suit : {"type":"but|carton_jaune|carton_rouge|carton_bleu|null","cible":"surnom ou null","confiance":0..1}.
"cible" doit correspondre exactement ou au surnom le plus proche de la liste fournie.`
}

const STYLES: Record<string, string> = {
  professionnel: "Ton journalistique sobre, à la manière d'un compte-rendu de presse sportive.",
  nouchi: "Ton local ivoirien, chaleureux et imagé, avec quelques expressions nouchi accessibles. Reste respectueux."
}

async function gemini(consigne: string, entree: string, forceJson = false) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY non configurée.')

  const bodyPayload: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: consigne }] },
    contents: [{ role: 'user', parts: [{ text: entree }] }],
    generationConfig: {
      temperature: forceJson ? 0.1 : 0.7,
      maxOutputTokens: 1000, // Augmenté pour éviter que l'IA ne coupe en milieu de réponse
      ...(forceJson && { responseMimeType: 'application/json' })
    }
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
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
      // Déstructuration pour séparer la question du contexte Supabase
      const { question, contexte } = donnees ?? {}
      const entreeFormatted = `Question du supporter : ${question ?? ''}\n\nContexte des données du tournoi :\n${JSON.stringify(contexte ?? {}, null, 2)}`
      
      const texte = await gemini(CONSIGNES.chatbot, entreeFormatted)
      return new Response(JSON.stringify({ texte }), { headers: CORS })
    }

    if (tache === 'intention_vocale') {
      const jsonStr = await gemini(CONSIGNES.intention_vocale, JSON.stringify(donnees), true)
      return new Response(jsonStr || '{"type":null,"cible":null,"confiance":0}', { headers: CORS })
    }

    if (tache === 'verifier_visage') {
      // Comparaison faciale : voir docs/ANTI_FRAUDE.md
      return new Response(JSON.stringify({ doublon: false, motif: 'non_configure' }), { headers: CORS })
    }

    return new Response(JSON.stringify({ erreur: 'Tâche inconnue' }), { status: 400, headers: CORS })
  } catch (e) {
    return new Response(JSON.stringify({ erreur: String(e) }), { status: 500, headers: CORS })
  }
})