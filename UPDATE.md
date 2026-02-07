# UPDATE.md — Audit fonctionnel & plan de correction

## 1) Méthode d’audit
- Relecture complète des pages web des modules `tasks`, `tickets`, `messages`, `files`, `payments`, `milestones`.
- Relecture des services NestJS correspondants (`TasksService`, `TicketsService`, `MessagesService`, `FilesService`, `PaymentsService`, `ProjectsService`).
- Vérification des flux réels disponibles côté UI vs capacités backend.
- Vérification proactive des failles produit/sécurité/UX au-delà de la liste initiale.

## 2) Vérification de tes constats

### 2.1 Tâches / Kanban drag & drop
Statut: **CONFIRMÉ**

Constat:
- Le board est une vue par colonnes avec changement de statut via `<select>`, sans drag & drop Trello-like.
- Front: `apps/web/app/[locale]/projects/[id]/tasks/page.tsx:91-123`, `apps/web/app/[locale]/projects/[id]/tasks/page.tsx:105-117`.

Impact:
- UX insuffisante pour un vrai kanban opérationnel.
- Perte de productivité admin sur priorisation/reordering.

Actions:
- Implémenter DnD colonne + reorder intra-colonne (optimistic UI + rollback).
- Exposer un endpoint de reorder atomique (batch) pour persister `status` + `position`.
- Gérer collisions de positions et renumérotation côté backend.
- Ajouter audit explicite du move (`fromStatus`, `toStatus`, `fromPos`, `toPos`).

Critères d’acceptation:
- Drag entre colonnes et dans la même colonne.
- Persistance robuste après refresh.
- Pas de double écriture incohérente en actions concurrentes.

---

### 2.2 Tickets (création, gestion, paiement, UX)
Statut: **CONFIRMÉ (avec nuances)**

#### A) Création ticket depuis `/tickets` (global)
- Constat: pas de CTA de création; seulement listing + lien vers module projet.
- Front: `apps/web/app/[locale]/tickets/page.tsx:47-77`.
- Impact: parcours client cassé, navigation inutilement profonde.

Actions:
- Ajouter bouton `Créer un ticket` sur `/tickets`.
- Créer page dédiée `/tickets/new` avec sélection du projet autorisé.
- Pré-remplir projet si navigation depuis un projet.

#### B) Paiement ticket côté client
- Constat principal: l’action admin `request-payment` ne crée pas de `PaymentEntity`.
- Back: `apps/api/src/modules/tickets/tickets.service.ts:207-236`.
- Front admin: bouton `Demander paiement` appelle uniquement `/tickets/:id/request-payment`.
- Front: `apps/web/app/[locale]/projects/[id]/tickets/page.tsx:49-61`.
- Or checkout client dépend d’un objet payment (`/payments/:id/checkout-session`).
- Back: `apps/api/src/modules/payments/payments.service.ts:148-213`.

Conclusion:
- **Flux “ticket payant” incomplet**: ticket passe en `PAYMENT_REQUIRED`, mais pas de paiement payable garanti.

Actions:
- Transformer `request-payment` en commande métier unique qui:
  - met le ticket en `PAYMENT_REQUIRED`,
  - crée un `PaymentEntity` lié au ticket,
  - notifie le client,
  - renvoie les infos de paiement.
- Côté client, afficher sur ticket le CTA `Payer` quand paiement `PENDING` existe.
- Interdire `convert-to-task` tant que paiement non payé pour ticket payant.

#### C) Option tickets gratuits
- Nuance: le backend supporte déjà un ticket gratuit (statut `OPEN` par défaut si pas de prix).
- Back: `apps/api/src/modules/tickets/tickets.service.ts:107-114`.
- Mais l’UI ne rend pas clair le mode `gratuit` vs `payant` (pas de modèle explicite côté formulaire).
- Front création: `apps/web/app/[locale]/projects/[id]/tickets/new/page.tsx:33-41`.

Actions:
- UX explicite: choix radio `Gratuit` / `Payant` (admin), avec champs conditionnels.
- Pour client: création toujours gratuite (ou policy configurable), jamais de champ prix.

#### D) Interface admin de gestion des statuts
- Constat: série de boutons sans workflow guidé, transitions peu lisibles.
- Front: `apps/web/app/[locale]/projects/[id]/tickets/page.tsx:91-118`.

Actions:
- Remplacer par un state-machine UI:
  - timeline de statut,
  - actions contextuelles valides uniquement,
  - confirmations explicites,
  - raisons obligatoires pour `reject`/`needs-info`.
- Ajouter filtres (`status`, `type`, `payment`) + recherche.

#### E) Incohérence de machine d’état
- Constat critique: conversion autorisée depuis `OPEN`.
- Back: `apps/api/src/modules/tickets/tickets.service.ts:300-304`.
- Règle produit attendue: conversion après acceptation (et paiement si requis).

Actions:
- Retirer `OPEN` des statuts convertibles.
- Encapsuler transitions dans un service de state machine stricte + tests d’intégration.

---

### 2.3 Messagerie
Statut: **CONFIRMÉ (partiellement implémentée, insuffisante)**

Constat:
- Messagerie existante en mode REST basique (list/create), sans WebSocket temps réel.
- Back: `apps/api/src/modules/messages/messages.service.ts:38-61`, `:63-119`.
- Aucun gateway WS trouvé dans `apps/api/src`.
- Front: simple liste + page “new” séparée, pas de thread live ni présence.
- Front: `apps/web/app/[locale]/projects/[id]/messages/page.tsx`, `.../messages/new/page.tsx`.

Impact:
- UX très loin d’une vraie messagerie projet.

Actions:
- Ajouter gateway WebSocket (auth JWT, room par projet/workspace).
- Événements: `message.created`, `typing`, `read.receipt` (option).
- UI chat persistante (composer intégré, update en temps réel, ancrage bas).
- Possibilité de lier message ↔ ticket depuis l’UI.
- Affichage des événements d’activité dans le flux (ou timeline parallèle).

---

### 2.4 Fichiers
Statut: **PARTIELLEMENT CONFIRMÉ**

Constat:
- Le module n’est pas “inexistant” techniquement (upload/list/download présents), mais il est incomplet vis-à-vis du besoin premium.
- Front: `apps/web/app/[locale]/projects/[id]/files/page.tsx`, `.../files/new/page.tsx`.
- Back: `apps/api/src/modules/files/files.service.ts`.

Manques majeurs:
- Pas de preview images/PDF.
- Pas de versioning fonctionnel côté UI.
- Pas de suppression/restauration UI.
- Pas de regroupement UX par dossiers métier (Branding/Contenu/Livrables).
- Pas de liaison claire fichier ↔ ticket/message côté UX.

Actions:
- UI “file manager” avec sections dossiers, filtres et recherche.
- Preview natif (image/pdf/text).
- Versioning visible (timeline versions).
- Gestion admin delete/restore.
- Upload drag-drop multi-fichiers + progression.

---

### 2.5 Paiements
Statut: **PARTIELLEMENT CONFIRMÉ**

Constat:
- Le module existe (create/list/checkout/webhook), donc pas inexistant.
- Mais il est incomplet pour le flux métier ticket + UX globale.
- Back: `apps/api/src/modules/payments/payments.service.ts`.
- Front: `apps/web/app/[locale]/projects/[id]/payments/page.tsx`, `.../payments/new/page.tsx`.

Manques/risques:
- Pas de pages web de retour Stripe par défaut (`/payments/success`, `/payments/cancel`) alors que fallback service les construit.
- Back: `apps/api/src/modules/payments/payments.service.ts:174-179`.
- Web routes correspondantes absentes.
- Pas de tableau global des paiements ni vue synthèse “reste à payer”.
- Pas de lien UX fort ticket ↔ paiement.

Actions:
- Ajouter pages de retour checkout + gestion robuste des états (pending/success/cancel).
- Ajouter réconciliation UI pilotée par webhook (polling ou push event).
- Ajouter dashboard paiement (total dû, payé, en retard).
- Ajout champs métier type paiement (`acompte`, `jalon`, `solde`, `ticket`).

---

### 2.6 Jalons / double validation
Statut: **CONFIRMÉ**

Constat:
- Modèle actuel = validation unique booléenne, pas de double validation client/freelance.
- Entity: `apps/api/src/database/entities/milestone-validation.entity.ts:41-55`.
- Service: `apps/api/src/modules/projects/projects.service.ts:254-258`.
- Endpoint de validation sans restriction de rôle explicite (pas de `@Roles`), les deux rôles peuvent toggler la même validation.
- Controller: `apps/api/src/modules/projects/projects.controller.ts:71-78`.
- UI: un simple toggle par jalon.
- Front: `apps/web/app/[locale]/projects/[id]/milestones/page.tsx:39-71`.

Actions:
- Refaire modèle data:
  - `validatedByAdminAt`, `validatedByClientAt`, commentaires séparés,
  - statut dérivé (`PENDING_ADMIN`, `PENDING_CLIENT`, `FULLY_VALIDATED`).
- Workflow explicite à 2 signatures.
- UI timeline claire des validations + blocage actions aval tant que non validé.

---

## 3) Failles/problèmes additionnels détectés (proactif)

### 3.1 Sécurité
1. **Session stockée en localStorage** (tokens accessibles en cas XSS).
- `apps/web/lib/auth/storage.ts:10-33`.
- Action: migrer vers cookies httpOnly sécurisés + rotation refresh côté serveur.

2. **Upload: pas de whitelist MIME explicite**.
- DTO accepte n’importe quel `contentType` string.
- `apps/api/src/modules/files/dto/create-upload-url.dto.ts:21-23`.
- Action: whitelist stricte MIME + extension + blocage double extension.

3. **Upload: `ticketId` et `messageId` non validés en cohérence métier**.
- Assignés directement à l’asset sans vérification d’appartenance stricte.
- `apps/api/src/modules/files/files.service.ts:60-63`.
- Action: vérifier ticket/message existent, même workspace + même projet.

4. **State machine ticket permissive** (conversion depuis `OPEN`).
- `apps/api/src/modules/tickets/tickets.service.ts:300-304`.
- Action: verrouiller transitions.

### 3.2 Produit / UX
1. **Mobile navigation incomplète**: nav desktop cachée, pas de menu mobile de remplacement.
- `apps/web/components/layout/app-shell.tsx:77` (`hidden ... md:flex`).
- Action: menu mobile (drawer/sheet) + accès complet.

2. **Erreurs génériques peu actionnables** sur plusieurs pages (`PROJECT_LOAD_FAILED` mappé sur erreur générique).
- Action: mapper erreurs API par code métier + messages ciblés.

3. **Tickets globaux**: pas de filtres/recherche/groupement par projet.
- Action: ajouter filtres + tri + recherche full-text.

4. **Messagerie**: pas de composer inline dans la liste (navigation “new” séparée lourde).
- Action: composer intégré + UX chat standard.

### 3.3 Robustesse technique
1. **Pas d’endpoint batch reorder kanban** (important pour DnD fiable).
- Action: endpoint transactionnel `PATCH /tasks/reorder`.

2. **Pas de tests intégration e2e sur parcours critiques** (ticket payant complet, invitation complète, upload auth, jalons double signature).
- Action: ajouter suite e2e prioritaire.

---

## 4) Plan de remédiation priorisé

## Phase P0 (bloquant business)
1. Corriger le workflow ticket payant de bout en bout.
2. Verrouiller la state machine ticket (pas de conversion depuis `OPEN`).
3. Créer `/tickets/new` global + CTA depuis `/tickets`.
4. Ajouter pages checkout `success/cancel` + réconciliation paiement.
5. Définir modèle double validation jalons + API stricte.

## Phase P1 (expérience premium attendue)
1. Kanban drag & drop complet avec persistance de position.
2. Refonte UX module tickets (workflow visuel + filtres + actions contextuelles).
3. Messagerie temps réel (WS + UI chat).
4. File manager avancé (preview/versioning/dossiers/delete admin).

## Phase P2 (hardening sécurité/qualité)
1. Migration auth vers cookies httpOnly.
2. Whitelist MIME stricte + validation ticket/message lors upload.
3. Throttling ciblé upload/messages/tickets (au-delà du throttle global).
4. Observabilité métier (codes erreurs standardisés, tracing par action).
5. E2E complets des happy paths admin/client.

---

## 5) Définition de fini (DoD) par module

### Tickets
- Création possible depuis `/tickets` et depuis projet.
- Statuts pilotés par machine d’état stricte.
- Ticket gratuit/payant explicite en UX.
- Paiement ticket réellement payable par client + conversion auto en tâche après paiement.

### Tasks / Kanban
- DnD inter-colonnes + intra-colonne.
- Persistant, robuste en concurrence, audité.

### Messages
- Temps réel WS + stockage DB + notifications.
- UX chat professionnelle.

### Files
- Upload sécurisé, preview, versioning, dossiers, delete admin.

### Payments
- Flux Stripe complet (create -> checkout -> webhook -> UI success state).
- Historique clair + synthèse due/paid.

### Milestones
- Double validation admin/client obligatoire.
- Statuts intermédiaires lisibles et actionnables.

---

## 6) Conclusion de vérification
- Tes points sont **globalement justes**.
- Certains modules existent techniquement (`files`, `payments`, `messages`) mais restent **incomplets** par rapport au niveau produit attendu.
- Les deux plus critiques à corriger immédiatement: **workflow ticket payant** et **machine d’état ticket/jalons**.
