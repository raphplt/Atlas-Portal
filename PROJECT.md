## 🧾 Cahier des charges – Client Portal Freelance (V1) — Multi-admin ready

### Objectif

Créer un **espace client premium** (usage interne au départ) pour centraliser :

- suivi de projet
- demandes/tickets + validation
- fichiers
- messagerie
- paiements Stripe
- notifications email

### Principes

- **Minimal mais premium**
- **Multi-tenant dès le départ** (plusieurs admins/organisations possibles plus tard)
- **Sécurité & traçabilité** (audit log léger)
- **Extensible** sans refacto massif
- **Séparation claire** entre **tâches projet** et **tickets**

---

# 1) Modèle produit

## 1.1 Rôles

### Admin

- gère projets/clients de son “espace”
- crée les **tâches projet** (structure du projet)
- gère kanban + statuts
- valide/refuse les tickets, fixe prix si besoin
- gère paiements & livrables
- modère fichiers/messages

### Client

- accès à ses projets uniquement
- lecture **timeline + kanban**
- création de **tickets** (principalement après livraison / hors scope)
- upload fichiers
- messagerie projet
- paiement Stripe + validation d’étapes

> Option future : “Admin secondaire / Collaborateur” (même workspace, permissions limitées).

---

# 2) Modules V1

## MODULE A — Dashboard projet

**But :** vision en 10 secondes.

**Contenu minimum**

- état global : `En cours / En attente client / Terminé`
- prochaine étape + “action attendue du client” (si bloqué)
- dernière update (timestamp + auteur)
- progression (barre ou étape)
- accès rapide : **Envoyer message / Voir paiements / Voir fichiers / (Créer ticket si activé)**
- date estimée (optionnel)

**Plus-value premium**

- timeline (Design → Dev → Recette → Livraison)
- bloc “à valider” (maquette, livraison, jalon)

---

## MODULE B — Tâches projet (core) + Kanban

### Distinction clé (à respecter)

Il y a **2 objets différents** :

#### 1) **Tâches projet (core)**

- créées par l’admin dès le début
- décrivent le travail de création du site (et l’avancement)
- le client ne les modifie pas

#### 2) **Tâches issues de tickets**

- n’existent que lorsqu’un ticket est accepté (et éventuellement payé)
- souvent après livraison / hors scope

### Kanban (lecture client, gestion admin)

**Colonnes**

- Backlog projet
- En cours
- En attente client
- Terminé
- Demandes client (tickets en attente de décision)

**Règles**

- Client : lecture seule
- Admin : CRUD tâches + drag/drop
- Une tâche peut être “bloquée par client” (tag + raison)
- Les tickets n’entrent dans le kanban en “tâche” **qu’après acceptation** (et paiement si payant)

**UX recommandée**

- badge/filtre : `Projet` vs `Demande client` (clair et premium)

---

## MODULE C — Tickets / demandes client

**Client peut**

- créer ticket (type : bug / modif / amélioration / question)
- description + pièces jointes
- commenter (thread)

**Workflow**

1. Ticket créé → colonne “Demandes client”
2. Admin choisit un statut :
   - `À clarifier`
   - `Refusé`
   - `Accepté` → **converti en tâche** (ajout au backlog projet)
   - `Payant` → attente paiement puis conversion en tâche

### Option “ticket payant”

**But :** cadrer hors scope.

- admin fixe : prix, description, (délai optionnel)
- client : `Accepter & payer` (Stripe) ou refuser
- après paiement : ticket passe `Payé/Accepté` + **création tâche** en backlog

---

## MODULE D — Messagerie projet

**But :** remplacer WhatsApp/email.

- conversation unique par projet
- messages texte
- pièces jointes
- email notif sur nouveau message

Temps réel optionnel (websocket), V1 acceptable sans si UX clean.

---

## MODULE E — Fichiers / Charte graphique / Livrables

**Dossiers standards**

- Branding (logo, charte, couleurs, typo)
- Contenu (textes, assets)
- Livrables (maquettes, exports, zip final)

**Fonctions**

- upload admin + client
- preview images/pdf
- versionning simple (v1/v2/final)
- suppression réservée admin (ou soft delete)

---

## MODULE F — Paiements Stripe

**Types**

- acompte
- milestone
- solde
- ticket payant

**Fonctions**

- admin crée une demande de paiement (titre, montant, description, échéance optionnelle)
- client paye via Stripe
- statuts : `En attente / Payé / Annulé / Expiré`
- liaison paiement ↔ projet + (optionnel) ↔ ticket

**Bonus premium**

- affichage “reste à payer”
- facture côté Stripe

---

## MODULE G — Notifications email

**Triggers V1**

- nouveau ticket
- réponse ticket
- message reçu
- paiement demandé
- paiement reçu
- fichier upload (optionnel)

Préférences email client : optionnel V1.

---

# 3) Fonctions transverses essentielles

## 3.1 Validation client

Boutons “Valider” sur jalons :

- maquette
- contenu
- livraison

Avec date + auteur + commentaire optionnel.

## 3.2 Notes privées admin

Notes internes par projet/client (invisible client).

## 3.3 Journal d’activité (audit light)

Timeline auto :

- “Ticket #12 créé”
- “Paiement reçu”
- “Fichier upload”
- “Tâche déplacée en En cours”

---

# 4) Exigences architecture multi-admin ready

## 4.1 Multi-tenant

Modéliser un **Workspace/Organization** :

- workspace contient : admins, clients, projets
- toutes les entités rattachées à :
  - `workspace_id`
  - `project_id`

## 4.2 Branding agnostique

- aucun branding hardcodé
- settings workspace :
  - nom affiché
  - logo (option)
  - couleurs (future)
  - email sender name

---

# 5) Sécurité & conformité (non négociable)

## 5.1 Auth & accès

- Nest Auth (JWT + refresh ou sessions) + RBAC (admin/client)
- vérifs systématiques workspace_id/project_id sur chaque endpoint
- interdiction cross-tenant by design

## 5.2 Sécurité fichiers

- Cloudflare : stockage privé + URLs signées
- whitelist type/size + rate limit upload

## 5.3 Protections API

- validation DTO stricte (class-validator)
- rate limiting (login, upload, endpoints sensibles)
- anti-CSRF si cookies
- logs + alerting

## 5.4 Paiement

- webhooks Stripe vérifiés (signature)
- statut paiement basé uniquement sur webhook/serveur

---

# 6) Stack technique validée

- **Front** : Next.js (latest) + shadcn/ui + Tailwind
- **Backend** : NestJS (REST)
- **DB** : Postgres
- **Storage** : Cloudflare (R2/Images) + liens signés
- **Paiement** : Stripe (Checkout + webhooks)
- **Email** : SendGrid / Mailgun / Postmark (volume + délivrabilité)
- **Temps réel** : option (WS) mais pas bloquant V1

---

# 7) Hors scope V1

- IA
- marketplace / ouverture à d’autres freelances
- gestion d’équipe avancée
- analytics poussées
- permissions fines (au-delà admin/client)

---

Si tu veux, prochaine étape : je te sors un **schéma Postgres** (tables + champs + relations) qui encode bien la séparation **core tasks vs tickets** + une **liste d’endpoints Nest** (guards/RBAC inclus).
