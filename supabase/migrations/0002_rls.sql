-- =====================================================================
--  RBAC : Super Admin / PCO / Visiteur
--  Lecture publique du fil d'actualité, écriture strictement contrôlée.
-- =====================================================================

create or replace function est_super_admin() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$ language sql stable security definer set search_path = public;

create or replace function est_pco_du_match(m uuid) returns boolean as $$
  select exists (select 1 from matchs where id = m and pco_id = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function est_pco_equipe(e uuid) returns boolean as $$
  select exists (
    select 1
    from matchs m
    where m.pco_id = auth.uid()
      and (m.equipe_dom = e or m.equipe_ext = e)
  );
$$ language sql stable security definer set search_path = public;

alter table profiles    enable row level security;
alter table tournois    enable row level security;
alter table poules      enable row level security;
alter table equipes     enable row level security;
alter table membres     enable row level security;
alter table matchs      enable row level security;
alter table evenements  enable row level security;

-- Visiteurs : consultation libre et anonyme
create policy lecture_publique_tournois   on tournois   for select using (true);
create policy lecture_publique_poules     on poules     for select using (true);
create policy lecture_publique_equipes    on equipes    for select using (true);
create policy lecture_publique_matchs     on matchs     for select using (true);
create policy lecture_publique_evenements on evenements for select using (true);
-- Les données privées des membres restent réservées à l'admin et au PCO du match.
-- Le public lit uniquement la vue `v_membres_public`.
create policy lecture_membres_prives on membres for select
  using (est_super_admin() or est_pco_equipe(equipe_id));

create policy profil_soi_meme on profiles for select using (id = auth.uid() or est_super_admin());

-- Super Admin : contrôle total de la configuration
create policy admin_tournois   on tournois  for all using (est_super_admin()) with check (est_super_admin());
create policy admin_poules     on poules    for all using (est_super_admin()) with check (est_super_admin());
create policy admin_equipes    on equipes   for all using (est_super_admin()) with check (est_super_admin());
create policy admin_membres    on membres   for all using (est_super_admin()) with check (est_super_admin());
create policy admin_matchs     on matchs    for all using (est_super_admin()) with check (est_super_admin());
create policy admin_evenements on evenements for all using (est_super_admin()) with check (est_super_admin());

-- Inscriptions publiques : un club peut déposer un dossier en attente sur le tournoi actif.
create policy inscription_equipe_publique on equipes for insert
  with check (
    statut_inscription = 'en_attente'
    and poule_id is null
    and exists (select 1 from tournois t where t.id = tournoi_id and t.actif)
  );

create policy inscription_membre_publique on membres for insert
  with check (
    actif
    and exists (
      select 1
      from equipes e
      where e.id = equipe_id
        and e.statut_inscription = 'en_attente'
    )
  );

-- PCO : uniquement les matchs qui lui sont assignés
create policy pco_maj_match on matchs for update
  using (pco_id = auth.uid()) with check (pco_id = auth.uid());

create policy pco_saisie_evenement on evenements for insert
  with check (est_pco_du_match(match_id));

create policy pco_annule_evenement on evenements for delete
  using (est_pco_du_match(match_id));

-- Storage : bucket public en lecture, dépôt autorisé pour les inscriptions.
create policy photos_lecture_publique on storage.objects for select
  using (bucket_id = 'photos');

create policy photos_depot_inscription on storage.objects for insert
  with check (bucket_id = 'photos');

create policy photos_admin_all on storage.objects for all
  using (bucket_id = 'photos' and est_super_admin())
  with check (bucket_id = 'photos' and est_super_admin());
