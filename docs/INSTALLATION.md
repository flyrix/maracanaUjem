# Installation pas à pas

## 1. Projet Supabase

1. Créez un projet sur supabase.com (le plan gratuit suffit pour un tournoi de quartier).
2. SQL Editor → exécutez `0001_schema.sql`, puis `0002_rls.sql`, puis `0003_seed.sql`.
3. Storage → nouveau bucket **photos**, accès public en lecture.
4. Settings → API : copiez `Project URL` et `anon key` dans votre `.env`.

## 2. Comptes organisateurs

Créez les utilisateurs dans Authentication, puis attribuez-leur un rôle :

```sql
insert into profiles (id, nom, role)
values ('<uuid-utilisateur>', 'Aristide', 'super_admin');

insert into profiles (id, nom, role)
values ('<uuid-utilisateur>', 'Scripteur terrain 1', 'pco');
```

## 3. Agent IA

```bash
npm i -g supabase
supabase login
supabase link --project-ref <ref>
supabase secrets set GEMINI_API_KEY=...
supabase functions deploy ia-maracana
```

L'application fonctionne sans cette étape : la dictée reconnaît alors les formules courantes
en local, et les comptes-rendus restent indisponibles.

## 4. Mise en ligne

```bash
npm run build
```

Déployez `dist/` sur Netlify, Vercel ou Cloudflare Pages. Pensez à la règle de réécriture
`/* → /index.html` pour le routeur. L'application s'installe ensuite sur l'écran d'accueil
des téléphones (PWA) et garde ses ressources en cache.

## 5. Avant le premier match

- Validez les clubs inscrits depuis la console organisateur.
- Éditez et imprimez les planches de licences (fiche club → « Éditer les licences PDF »).
- Programmez les rencontres et assignez une table de marque à chacune.
- Sur le téléphone du scripteur, ouvrez la console une fois **avec réseau** : l'effectif est
  alors mis en cache et le match peut se dérouler entièrement hors-ligne.
