# BAFAALAKART — Design Spec

**Date :** 2026-07-11  
**Session :** BAFA À LA CARTE — Argentan — 12 au 19 juillet 2026  
**Statut :** Approuvé

---

## 1. Contexte

BAFAALAKART est une application web mobile-first pour gérer le déroulement d'une session BAFA. Elle permet :
- aux **stagiaires** de consulter leur planning et de s'inscrire aux temps facultatifs ;
- aux **formateurs** de suivre les inscriptions et de valider les présences ;
- aux **administrateurs** de gérer l'ensemble des données (utilisateurs, temps, inscriptions, imports, exports).

Périmètre : une seule session à la fois. Pas de multi-session.

---

## 2. Stack technique

| Couche | Choix | Justification |
|--------|-------|---------------|
| Framework | Next.js 14 (App Router, TypeScript strict) | Routing, SSR optionnel, middleware auth |
| UI | Tailwind CSS + shadcn/ui | Mobile-first, composants accessibles |
| Backend | Firebase Auth + Firestore (client SDK) | Temps réel natif, pas de serveur à maintenir |
| Hébergement | Firebase Hosting | Déploiement simple, CDN |
| Import | xlsx (parsing CSV/XLSX) | Export Google Sheets → fichier → upload |
| Export PDF | jsPDF + jspdf-autotable | Génération côté client |
| Export Excel | xlsx | Même lib que l'import |
| Tests unitaires | Vitest + Testing Library | Rapide, compatible Next.js |
| Tests E2E | Playwright + Firebase Emulator | Isolation complète |
| CI/CD | GitHub Actions | Repo déjà existant : BAFAALAKART |

**Approche :** Firebase SDK client-side pur. Toutes les opérations Firestore sont faites depuis le navigateur. La sécurité est assurée par les règles Firestore et Firebase Auth. Choix justifié par la nature interne de l'app (~50 utilisateurs max, session unique).

---

## 3. Architecture des dossiers

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (stagiaire)/
│   │   └── dashboard/page.tsx
│   ├── (formateur)/
│   │   └── dashboard/page.tsx
│   ├── (admin)/
│   │   └── dashboard/page.tsx
│   ├── layout.tsx
│   └── middleware.ts
├── components/
│   ├── ui/                    # shadcn/ui (Button, Card, Badge, Checkbox…)
│   ├── planning/              # PlanningView, CreneauCard, TempsCard
│   ├── presence/              # PresenceList, PresenceCheckbox
│   └── admin/                 # ImportPanel, ExportPanel, UserManager, TempsManager
├── lib/
│   ├── firebase/
│   │   ├── config.ts          # initializeApp, auth, db
│   │   └── rules/             # firestore.rules (source de vérité)
│   ├── auth/
│   │   ├── identifiant.ts     # Génération identifiant (prénom[0]+nom, dédup)
│   │   └── password.ts        # Génération mot de passe aléatoire
│   └── utils/
│       ├── planning.ts        # Calcul planning stagiaire (bleus auto)
│       ├── inscriptions.ts    # Règles inscription (créneau unique, verrou)
│       └── export.ts          # Helpers PDF/Excel
├── hooks/
│   ├── useAuth.ts
│   ├── useTemps.ts
│   ├── useInscriptions.ts
│   └── usePresences.ts
├── types/
│   └── index.ts               # Tous les types TypeScript partagés
└── services/
    ├── users.ts
    ├── temps.ts
    ├── creneaux.ts
    ├── inscriptions.ts
    ├── presences.ts
    ├── ateliers.ts
    └── historique.ts
```

---

## 4. Modèle de données Firestore

### `users/{uid}`
```typescript
{
  uid: string
  nom: string
  prenom: string
  identifiant: string          // ex: "jdupont"
  role: "stagiaire" | "formateur" | "admin"
  typeStagiaire?: "Base" | "Approfondissement"  // uniquement si role === "stagiaire"
  createdAt: Timestamp
}
```

### `session/{sessionId}`
```typescript
{
  nom: string                  // "BAFA À LA CARTE"
  lieu: string                 // "Argentan"
  dateDebut: Timestamp
  dateFin: Timestamp
}
```

### `creneaux/{creneauId}`
```typescript
{
  jour: string                 // ISO date "2026-07-12"
  heureDebut: string           // "09:00"
  heureFin: string             // "11:00"
  ordre: number                // tri dans la journée
}
```

### `temps/{tempsId}`
```typescript
{
  nom: string
  description: string
  type: "bleu" | "orange" | "violet" | "sans_formation"
  creneauId: string
  obligatoireBase: boolean       // bleu uniquement
  obligatoireAppro: boolean      // bleu uniquement
  atelierId?: string             // violet uniquement
  capaciteMin: number            // 4 par défaut
}
```

### `ateliers/{atelierId}`
```typescript
{
  nom: string
  description: string
}
```

### `inscriptions/{inscriptionId}`
```typescript
{
  stagiaireId: string
  tempsId: string
  dateCreation: Timestamp
  origine: "auto" | "choix" | "admin"
  verrouille: boolean          // true si présence validée
}
```

### `presences/{presenceId}`
```typescript
{
  stagiaireId: string
  tempsId: string
  present: boolean
  validePar: string            // uid du formateur
  dateValidation: Timestamp
}
```

### `historique/{entryId}`
```typescript
{
  action: string               // "inscription_created" | "presence_validated" | ...
  utilisateurId: string
  details: Record<string, unknown>
  date: Timestamp
}
```

---

## 5. Authentification

### Principe
Firebase Auth requiert un email. L'app génère un email fictif interne jamais exposé à l'utilisateur :
```
{identifiant}@bafaalakart.app
```

L'utilisateur se connecte avec **identifiant + mot de passe**. L'app convertit en interne :
```typescript
signInWithEmailAndPassword(auth, `${identifiant}@bafaalakart.app`, password)
```

### Génération des identifiants
1. Normaliser : supprimer accents, minuscules, espaces → `prenom[0] + nom`
2. Vérifier l'unicité dans Firestore
3. Si doublon : ajouter suffixe numérique incrémental (`jdupont1`, `jdupont2`…)

### Mots de passe
Générés aléatoirement (12 caractères alphanumériques). Fichier export produit à l'import :

| Nom | Prénom | Identifiant | Mot de passe |
|-----|--------|-------------|--------------|
| Dupont | Jean | jdupont | aX7kP2mN9qRs |

### Compte admin
Identifiant : `elepareur` — créé au premier seed ou via l'interface admin.

### Middleware Next.js
- Routes `(stagiaire)/*`, `(formateur)/*`, `(admin)/*` protégées
- Token Firebase vérifié côté client (onAuthStateChanged)
- Redirection `/login` si non authentifié
- Redirection vers le bon dashboard selon `role`

---

## 6. Règles métier

### Types de temps

| Type | Couleur | Inscription | Modifiable | Règles spéciales |
|------|---------|-------------|------------|-----------------|
| Bleu | Bleu | Automatique | Non | Affiché selon `typeStagiaire` |
| Orange | Orange | Manuelle | Oui (si pas de présence) | 1 par créneau |
| Violet | Violet | Manuelle (atelier) | Non (verrouillé) | Inscrit à tous les créneaux de l'atelier |
| Sans formation | Gris | Aucune | — | Affiché dans le planning global |

### Contrainte 1 temps par créneau
- Un stagiaire ne peut s'inscrire qu'à **un seul** temps par créneau
- Vérification côté client avant écriture
- Transaction Firestore pour éviter les race conditions

### Ateliers violets
- L'inscription à un atelier crée une inscription pour **chaque** `temps` lié au même `atelierId`
- Ces inscriptions ont `origine: "auto"` et `verrouille: true`
- Le créneau correspondant est bloqué pour tout autre choix
- L'atelier ne peut pas être quitté
- Opération atomique via transaction Firestore multi-docs

### Verrouillage après présence
- Si `presences` contient une entrée `present: true` pour `stagiaireId + tempsId` → inscription verrouillée
- Le stagiaire ne peut plus modifier
- Seul l'admin peut intervenir
- L'inscription est marquée `verrouille: true`

### Capacité minimale
- Alerte UI si `count(inscriptions where tempsId) < 4`
- Jamais de déplacement automatique — l'admin décide manuellement

---

## 7. Interfaces utilisateur

### Login (`/login`)
- Champ "Identifiant" + champ "Mot de passe"
- Aucun email visible
- Message d'erreur clair en cas d'échec
- Mobile-first, centré

### Dashboard Stagiaire (`/dashboard`)
**Navigation bas** : Planning | Ateliers

- **Planning** : vue par jour, créneaux chronologiques
  - Temps bleus : badge "Obligatoire", non interactifs
  - Temps oranges : bouton "Rejoindre" / "Quitter" (si pas verrouillé)
  - Temps violets : badge "Atelier", verrou si présence validée
  - Temps sans formation : affichés en gris, non interactifs
- **Ateliers** : liste des ateliers violets inscrits avec tous leurs créneaux

### Dashboard Formateur (`/formateur`)
**Navigation** : Temps | Présences  
**Filtre jour** persistant en haut

- **Temps** : liste des temps du jour sélectionné, nombre d'inscrits, alerte rouge si < 4
- **Présences** : sélectionner un temps → liste stagiaires avec cases à cocher → bouton "Valider" (enregistre uid formateur + timestamp)

### Dashboard Admin (`/admin`)
**Onglets** : Utilisateurs | Temps | Inscriptions | Import | Export

- **Utilisateurs** : liste, modification rôle/type, reset mot de passe
- **Temps** : CRUD créneaux et temps, gestion ateliers
- **Inscriptions** : vue matricielle stagiaire×temps, déplacer/ajouter/supprimer
- **Import** : upload CSV/XLSX → prévisualisation tableau → confirmation → création comptes Firebase → téléchargement fichier identifiants
- **Export** :
  - PDF : liste stagiaires par temps, feuilles de présence
  - Excel : stagiaires, formateurs, inscriptions, présences

---

## 8. Import

**Format accepté :** CSV ou XLSX (export Google Sheets)

**Import stagiaires — colonnes requises :**
| Nom | Prénom | Type |
Valeurs Type : `Base` ou `Approfondissement`

**Import formateurs — colonnes requises :**
| Nom | Prénom |

**Pipeline d'import :**
1. Parse du fichier (xlsx)
2. Validation colonnes requises
3. Génération identifiant (avec dédup)
4. Génération mot de passe
5. Création compte Firebase Auth (`createUserWithEmailAndPassword`)
6. Écriture document Firestore `users/`
7. Écriture en batch (max 500 ops/batch)
8. Téléchargement fichier récapitulatif (CSV)

---

## 9. Export

**PDF (jsPDF) :**
- Liste des stagiaires par temps (avec nombre d'inscrits)
- Feuilles de présence vierges (tableau stagiaire / case à signer)
- Feuilles de présence remplies (état actuel)

**Excel (xlsx) :**
- Feuille 1 : stagiaires (nom, prénom, identifiant, type)
- Feuille 2 : formateurs (nom, prénom, identifiant)
- Feuille 3 : inscriptions (stagiaire, temps, créneau, origine)
- Feuille 4 : présences (stagiaire, temps, présent, validé par, date)

---

## 10. Tests

### Unitaires / Composants (Vitest + Testing Library)
- `identifiant.ts` : génération, normalisation accents, déduplication
- `inscriptions.ts` : contrainte 1/créneau, verrou après présence, logique atelier violet
- `planning.ts` : affichage temps bleus selon typeStagiaire
- Composants : LoginForm, PlanningView, PresenceList, ImportPanel

### E2E (Playwright + Firebase Emulator)
- Connexion par rôle (stagiaire / formateur / admin)
- Stagiaire : choisir temps orange → vérifier inscription
- Stagiaire : s'inscrire à atelier violet → vérifier inscription automatique tous créneaux
- Formateur : valider présence → vérifier verrouillage côté stagiaire
- Admin : import CSV → vérifier comptes créés
- Export PDF/Excel → vérifier téléchargement

---

## 11. CI/CD (GitHub Actions)

```yaml
# Sur push et PR vers main
jobs:
  ci:
    steps:
      - npm ci
      - ESLint + tsc --noEmit
      - Vitest
      - Firebase Emulator + Playwright
      - next build

  deploy:
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - firebase deploy --only hosting
```

Secrets GitHub requis : `FIREBASE_TOKEN`, variables d'environnement Firebase.

---

## 12. Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Race condition inscription (2 stagiaires même créneau) | Transaction Firestore atomique |
| Inscription atelier violet partielle | Transaction multi-docs atomique |
| Import > 500 users | Batch writes par chunks de 499 |
| Export PDF lent sur mobile | Spinner + génération asynchrone |
| Règles Firestore mal écrites | Tests Emulator en CI |
| Perte données session | Export régulier encouragé, pas de delete sans confirmation |
