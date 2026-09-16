# Architecture

## Vue d'ensemble

```
Supporters (PWA)            Table de marque (PWA)         Organisateur
      │                            │                            │
      │  WebSocket (Realtime)      │  écriture locale d'abord    │  REST
      ▼                            ▼                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                        │
│  tournois · poules · equipes · membres · matchs · evenements     │
│  vues : v_classement · v_soulier_or · v_discipline               │
│  RLS  : super_admin / pco (match assigné) / lecture publique     │
└──────────────────────────────────────────────────────────────────┘
      │                                          │
      │ Storage (photos, logos)                  │ Edge Function `ia-maracana`
      ▼                                          ▼
   Bucket S3-compatible                    Gemini / OpenAI (clé côté serveur)
```

## Décisions structurantes

**Le score n'est jamais saisi à la main.** Il est recalculé par trigger à partir de la table
`evenements`. Annuler un but revient à supprimer l'événement : le score suit, sur tous les écrans.

**Le chronomètre vit en base.** `chrono_demarre_a` + `chrono_offset_sec` suffisent à reconstituer
le temps de jeu sur n'importe quel appareil. Aucun compteur ne dérive entre la console et le live.

**Hors-ligne d'abord, côté table de marque uniquement.** Les supporters ont besoin du réseau ;
le scripteur, non. La file `outbox` (Dexie) est la source de vérité locale pendant la coupure.

**L'IA ne décide de rien.** Elle propose une interprétation de la dictée, que le scripteur valide.
La reconnaissance des formules courantes se fait sur l'appareil, donc sans réseau ; le modèle
n'est appelé que pour les phrases inhabituelles.

## Latence du direct

Supabase Realtime diffuse l'`UPDATE` de `matchs` et l'`INSERT` de `evenements` sur le canal
`match:<id>`. En conditions normales, l'affichage supporter suit le clic du scripteur sous la seconde.
Le badge carton bleu décompte localement à partir de `expire_a`, donc sans aller-retour serveur.
