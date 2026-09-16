# Conformité au cahier des charges (v2.0)

| § | Exigence | Où c'est traité | État |
|---|---|---|---|
| 2 | Identifiant joueur = nom ou surnom, aucun numéro de maillot | `membres.nom`, formulaire d'inscription | Livré |
| 2 | Retrait zone 6 m, deux touches, cumul de fautes collectives | Aucune saisie correspondante n'existe (`rules.ts`) | Livré |
| 2 | Mode Open/Mixte, aucun contrôle de date de naissance | Pas de champ date de naissance au schéma | Livré |
| 2 | Carton bleu : exclusion 2 min, décompte sur le live | `rules.ts`, `CartonBleu.tsx`, `evenements.expire_a` | Livré |
| 2 | Cartons jaunes et rouges | `event_type`, vue `v_discipline` | Livré |
| 2 | Soulier d'Or et discipline, sans passe décisive | `v_soulier_or`, `v_discipline` | Livré |
| 3 | 10 joueurs, 1 président, 1 entraîneur | Trigger `verifier_effectif()` | Livré |
| 3 | Photo obligatoire pour tous les membres | `membres.photo_url NOT NULL` | Livré |
| 3 | Blason généré à partir des couleurs et initiales | `blason.ts` | Livré |
| 3 | Planche PDF de licences, format carte, QR unique | `licences.ts` | Livré |
| 3 | Scan QR au contrôle d'avant-match | `ControleQR.tsx` | Livré |
| 4.1 | Compte-rendu automatique, ton professionnel ou local | Edge Function `ia-maracana`, tâche `resume` | Livré |
| 4.2 | Dictée vocale à la table de marque | `voix.ts`, `analyserDictee`, console PCO | Livré |
| 4.3 | Détection de double inscription par analyse faciale | `verifier_visage` | Point d'extension — voir `ANTI_FRAUDE.md` |
| 4.4 | Chatbot supporters | `Assistant.tsx` | Livré |
| 5 | Interface tactile à grands boutons | `ConsolePCO.tsx` | Livré |
| 5 | Chronomètre maître, pause, gestion de période | `useChrono.ts`, `matchs.chrono_*` | Livré |
| 5 | Offline-first IndexedDB avec synchro au retour réseau | `db.ts`, `sync.ts` | Livré |
| 5 | Score temps réel < 1,5 s | Supabase Realtime, `useMatchLive.ts` | Livré |
| 6 | PostgreSQL via Supabase | `supabase/migrations` | Livré |
| 6 | jsPDF pour les licences | `licences.ts` | Livré |
| 6 | Gemini / OpenAI + transcription | Edge Function + Web Speech API | Livré |
| 6 | Stockage médias S3-compatible | Supabase Storage, bucket `photos` | Livré |
| 6 | RBAC Super Admin / PCO / Visiteur | `0002_rls.sql` | Livré |

## Deux écarts assumés, à valider avec vous

**Transcription vocale.** Le cahier des charges cite Whisper. La console utilise l'API Web Speech
du navigateur : c'est gratuit, instantané et cela fonctionne sans envoyer d'audio. En contrepartie,
elle exige Chrome ou Edge et une connexion. Si le scripteur travaille sur un terrain sans réseau,
il reste les gros boutons — c'est le mode nominal, la dictée est un confort. Brancher Whisper
demanderait d'enregistrer l'audio et de l'envoyer : plus lent et payant, pour un gain réel
uniquement sur les téléphones non-Chrome.

**Analyse faciale.** Le contrôle de double inscription est câblé de bout en bout, mais le service
de comparaison n'est pas choisi à votre place : ce choix engage un coût récurrent et le traitement
de données biométriques. `docs/ANTI_FRAUDE.md` compare les deux voies possibles.
