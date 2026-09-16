-- Jeu de démonstration : un tournoi de quartier avec quatre équipes.
insert into tournois (id, nom, saison, lieu)
values ('11111111-1111-1111-1111-111111111111', 'Maracana UJEM', '2026', 'Abidjan');

insert into poules (tournoi_id, nom) values
  ('11111111-1111-1111-1111-111111111111', 'Poule A'),
  ('11111111-1111-1111-1111-111111111111', 'Poule B');

insert into equipes (tournoi_id, nom, quartier, couleur_primaire, couleur_secondaire, statut_inscription) values
  ('11111111-1111-1111-1111-111111111111', 'Les Éléphants de Yop', 'Yopougon', '#0B3B2E', '#FF6B1A', 'validee'),
  ('11111111-1111-1111-1111-111111111111', 'Abobo Stars',          'Abobo',    '#1D6FE0', '#FFC400', 'validee'),
  ('11111111-1111-1111-1111-111111111111', 'Koumassi FC',          'Koumassi', '#E03131', '#F2F5EF', 'validee'),
  ('11111111-1111-1111-1111-111111111111', 'Treichville Boys',     'Treichville', '#FFC400', '#10241D', 'validee');
