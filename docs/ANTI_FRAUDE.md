# Contrôle d'identité et anti-fraude

Deux barrières complémentaires, à deux moments différents.

## Au moment de l'inscription — détection du même visage sous deux surnoms

La tâche `verifier_visage` de l'Edge Function reçoit la photo, en calcule un vecteur
(embedding) et le compare à ceux déjà stockés dans `membres.empreinte_faciale` pour le tournoi.
Au-dessus du seuil de similarité, l'inscription est refusée avec le nom du membre déjà présent.

L'implémentation livrée renvoie `doublon: false` tant que le service de vectorisation n'est pas
branché — c'est un point d'extension explicite, pas un contrôle qui ferait semblant de fonctionner.
Deux options éprouvées :

- **face-api.js / InsightFace** hébergé dans la Edge Function : vecteur de 128 à 512 dimensions,
  comparaison par distance cosinus, seuil autour de 0,6 à calibrer sur vos premières photos.
- **API de vision** d'un fournisseur : plus simple à brancher, mais chaque photo quitte votre
  infrastructure — à considérer avant de traiter des portraits de mineurs ou de non-consentants.

Mesure de prudence : conservez le vecteur, pas la comparaison. Un faux positif doit pouvoir être
levé par le Super Admin, sinon un joueur légitime se retrouve exclu sans recours.

## Avant le coup d'envoi — contrôle du QR

Chaque licence porte un `qr_token` aléatoire de 16 octets, unique et non devinable.
Le PCO scanne, l'application interroge la base et affiche la photo enregistrée à côté du
joueur qui se présente. C'est cette confrontation photo/personne qui fait le contrôle :
le QR prouve que la licence existe, l'œil du scripteur prouve que c'est bien le bon joueur.

Un membre suspendu garde son QR mais passe à `actif = false` : le scan affiche alors un refus
explicite plutôt qu'une licence introuvable.
