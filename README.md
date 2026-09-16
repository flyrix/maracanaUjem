# Maracana Petit Poteau — `maracanaUjem`

Plateforme de gestion de tournoi de maracana de quartier : fil d'actualité en direct
pour les supporters, console de table de marque utilisable hors-ligne au bord du terrain,
licences PDF avec QR de contrôle, et un agent IA qui rédige, dicte et répond.

Le règlement Petit Poteau est codé dans le produit, pas ajouté par-dessus :
pas de numéro de maillot, pas de passe décisive, mode Open/Mixte, carton bleu = 2 minutes.

---

## Démarrage

```bash
npm install
cp .env.example .env        # renseignez vos clés Supabase
npm run dev
```

### Base de données

Dans le SQL Editor de votre projet Supabase, exécutez dans l'ordre :

1. `supabase/migrations/0001_schema.sql` — tables, vues de classement, triggers
2. `supabase/migrations/0002_rls.sql` — RBAC Super Admin / PCO / Visiteur
3. `supabase/migrations/0003_seed.sql` — tournoi de démonstration (facultatif)

Créez ensuite un bucket public nommé **photos** (Storage) pour les portraits et logos.

### Agent IA

```bash
supabase secrets set GEMINI_API_KEY=votre_cle
supabase functions deploy ia-maracana
```

Reportez l'URL renvoyée dans `VITE_IA_FUNCTION_URL`. La clé du modèle reste côté serveur :
le navigateur ne la voit jamais.

---

## Ce que contient le dossier

| Chemin | Rôle |
|---|---|
| `src/lib/rules.ts` | Le règlement Petit Poteau, écrit une seule fois |
| `src/lib/db.ts`, `src/lib/sync.ts` | Stockage IndexedDB et file d'attente hors-ligne |
| `src/lib/licences.ts` | Planche PDF de licences, format carte, QR unique |
| `src/lib/blason.ts` | Blason vectoriel généré pour les clubs sans logo |
| `src/lib/ia.ts` | Reporter, co-pilote vocal, chatbot, anti-fraude |
| `src/pages/ConsolePCO.tsx` | Table de marque : chrono, gros boutons, dictée |
| `src/pages/MatchLive.tsx` | Direct supporters, badge carton bleu à décompte |
| `supabase/` | Schéma, RLS et Edge Function IA |
| `docs/` | Architecture, installation pas à pas, conformité |

## Rôles

- **Super Admin** — configure le tournoi, valide les inscriptions, programme les matchs, édite les licences.
- **PCO** — n'accède qu'aux matchs qui lui sont assignés ; la règle est appliquée en base, pas seulement dans l'interface.
- **Visiteur** — consulte le fil, les classements et l'assistant sans compte.

## Hors-ligne

La console écrit chaque fait de jeu dans IndexedDB avec un identifiant client unique,
puis le pousse vers Supabase dès le retour du réseau. Un événement rejoué après une coupure
ne crée jamais de doublon (`upsert` sur `client_uuid`). Le bandeau en haut de la console
indique ce qui reste à envoyer.
# maracanaUjem
