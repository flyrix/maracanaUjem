-- =====================================================================
--  MARACANA PETIT POTEAU — Schéma relationnel (PostgreSQL / Supabase)
--  Règles métier intégrées au niveau base : pas de numéro de maillot,
--  pas de passe décisive, carton bleu = exclusion temporaire 2 min.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Rôles applicatifs (RBAC) ----------
create type app_role as enum ('super_admin', 'pco', 'visiteur');
create type member_role as enum ('joueur', 'president', 'entraineur');
create type match_status as enum ('a_venir', 'en_cours', 'pause', 'termine');
create type event_type as enum ('but', 'carton_jaune', 'carton_rouge', 'carton_bleu', 'debut_periode', 'fin_periode');

-- ---------- Profils ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nom text not null,
  role app_role not null default 'visiteur',
  cree_le timestamptz not null default now()
);

-- ---------- Tournoi ----------
create table tournois (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  saison text,
  lieu text,
  duree_periode_sec int not null default 1500,      -- 25 min par défaut
  nb_periodes int not null default 2,
  duree_carton_bleu_sec int not null default 120,   -- règle Petit Poteau
  max_joueurs_par_equipe int not null default 10,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create table poules (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references tournois on delete cascade,
  nom text not null
);

-- ---------- Équipes & effectifs ----------
create table equipes (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references tournois on delete cascade,
  poule_id uuid references poules on delete set null,
  nom text not null,
  surnom text,
  quartier text,
  couleur_primaire text not null default '#0B3B2E',
  couleur_secondaire text not null default '#FF6B1A',
  logo_url text,                       -- null => blason généré automatiquement
  statut_inscription text not null default 'en_attente'
    check (statut_inscription in ('en_attente','validee','rejetee')),
  cree_le timestamptz not null default now(),
  unique (tournoi_id, nom)
);

create table membres (
  id uuid primary key default gen_random_uuid(),
  equipe_id uuid not null references equipes on delete cascade,
  nom text not null,                   -- nom OU surnom : identifiant unique du joueur
  role member_role not null default 'joueur',
  photo_url text not null,             -- obligatoire pour éditer la licence
  empreinte_faciale jsonb,             -- vecteur de comparaison anti-double-inscription
  qr_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  licence_num text,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Effectif plafonné : 10 joueurs, 1 président, 1 entraîneur
create or replace function verifier_effectif() returns trigger as $$
declare
  n int;
  maxi int;
begin
  select count(*) into n from membres
    where equipe_id = new.equipe_id and role = new.role and actif
      and (TG_OP = 'INSERT' or id <> new.id);
  select case when new.role = 'joueur' then t.max_joueurs_par_equipe else 1 end
    into maxi
    from equipes e join tournois t on t.id = e.tournoi_id
    where e.id = new.equipe_id;
  if n >= maxi then
    raise exception 'Effectif complet : % % maximum pour cette équipe.', maxi, new.role;
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_effectif before insert or update on membres
  for each row execute function verifier_effectif();

-- ---------- Matchs ----------
create table matchs (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references tournois on delete cascade,
  poule_id uuid references poules on delete set null,
  phase text not null default 'poule',
  equipe_dom uuid not null references equipes on delete restrict,
  equipe_ext uuid not null references equipes on delete restrict,
  pco_id uuid references profiles on delete set null,   -- table de marque assignée
  debut_prevu timestamptz,
  terrain text,
  statut match_status not null default 'a_venir',
  periode int not null default 1,
  chrono_demarre_a timestamptz,        -- null si en pause
  chrono_offset_sec int not null default 0,
  score_dom int not null default 0,
  score_ext int not null default 0,
  resume_ia text,
  resume_ia_style text,
  maj_le timestamptz not null default now(),
  check (equipe_dom <> equipe_ext)
);

-- ---------- Événements de jeu (source de vérité du score) ----------
create table evenements (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matchs on delete cascade,
  equipe_id uuid references equipes on delete cascade,
  membre_id uuid references membres on delete set null,
  type event_type not null,
  minute int not null default 0,
  chrono_sec int not null default 0,
  expire_a timestamptz,                -- carton bleu : fin des 2 minutes
  saisi_par uuid references profiles on delete set null,
  source text not null default 'tactile' check (source in ('tactile','vocal','import')),
  client_uuid uuid not null unique,    -- idempotence de la file hors-ligne
  cree_le timestamptz not null default now()
);

create index on evenements (match_id, cree_le);
create index on matchs (tournoi_id, statut);

-- Recalcul du score à chaque but
create or replace function maj_score() returns trigger as $$
declare m matchs;
begin
  select * into m from matchs where id = coalesce(new.match_id, old.match_id);
  update matchs set
    score_dom = (select count(*) from evenements e where e.match_id = m.id and e.type='but' and e.equipe_id = m.equipe_dom),
    score_ext = (select count(*) from evenements e where e.match_id = m.id and e.type='but' and e.equipe_id = m.equipe_ext),
    maj_le = now()
  where id = m.id;
  return null;
end $$ language plpgsql;

create trigger trg_score after insert or delete on evenements
  for each row when (pg_trigger_depth() = 0) execute function maj_score();

-- ---------- Classements ----------
-- Soulier d'Or : buteurs uniquement (aucune passe décisive, par règle métier)
create view v_soulier_or as
  select m.id as membre_id, m.nom, e.id as equipe_id, e.nom as equipe, e.tournoi_id,
         count(*) as buts
  from evenements ev
  join membres m on m.id = ev.membre_id
  join equipes e on e.id = ev.equipe_id
  where ev.type = 'but'
  group by m.id, m.nom, e.id, e.nom, e.tournoi_id
  order by buts desc;

create view v_discipline as
  select m.id as membre_id, m.nom, e.nom as equipe, e.tournoi_id,
         count(*) filter (where ev.type='carton_jaune') as jaunes,
         count(*) filter (where ev.type='carton_rouge') as rouges,
         count(*) filter (where ev.type='carton_bleu')  as bleus
  from evenements ev
  join membres m on m.id = ev.membre_id
  join equipes e on e.id = ev.equipe_id
  where ev.type in ('carton_jaune','carton_rouge','carton_bleu')
  group by m.id, m.nom, e.nom, e.tournoi_id;

-- Données joueurs visibles côté supporters, sans QR token ni empreinte faciale.
create view v_membres_public as
  select id, equipe_id, nom, role, photo_url, actif
  from membres
  where actif;

create view v_classement as
with res as (
  select equipe_dom as equipe_id, score_dom bp, score_ext bc, tournoi_id from matchs where statut='termine'
  union all
  select equipe_ext, score_ext, score_dom, tournoi_id from matchs where statut='termine'
)
select e.id as equipe_id, e.nom, e.logo_url, e.couleur_primaire, e.poule_id, r.tournoi_id,
       count(*) as joues,
       count(*) filter (where bp > bc) as gagnes,
       count(*) filter (where bp = bc) as nuls,
       count(*) filter (where bp < bc) as perdus,
       sum(bp) as buts_pour, sum(bc) as buts_contre, sum(bp) - sum(bc) as difference,
       count(*) filter (where bp > bc) * 3 + count(*) filter (where bp = bc) as points
from res r join equipes e on e.id = r.equipe_id
group by e.id, e.nom, e.logo_url, e.couleur_primaire, e.poule_id, r.tournoi_id
order by points desc, difference desc;

-- ---------- Temps réel ----------
alter publication supabase_realtime add table matchs;
alter publication supabase_realtime add table evenements;
