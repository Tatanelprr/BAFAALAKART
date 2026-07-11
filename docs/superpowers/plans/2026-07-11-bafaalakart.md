# BAFAALAKART Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Application web mobile-first de gestion de session BAFA (stagiaires, formateurs, admin) avec Firebase Auth + Firestore, Next.js 14, TypeScript strict.

**Architecture:** Next.js 14 App Router + Firebase client SDK (pas d'Admin SDK, sauf secondaryApp trick pour import). AuthProvider à la racine, guards dans les layouts de groupes de routes. Firestore real-time listeners via hooks.

**Tech Stack:** Next.js 14, TypeScript strict, Tailwind CSS, shadcn/ui, Firebase 10 (Auth + Firestore), xlsx, jsPDF + jspdf-autotable, Vitest + Testing Library, Playwright, GitHub Actions, Firebase Hosting.

**Spec de référence:** `docs/superpowers/specs/2026-07-11-bafaalakart-design.md`

---

## Map des fichiers

```
src/types/index.ts                         — tous les types partagés
src/lib/firebase/config.ts                 — init Firebase (auth, db)
src/lib/auth/identifiant.ts                — génération identifiant + dédup
src/lib/auth/password.ts                   — génération mot de passe aléatoire
src/lib/utils/planning.ts                  — calcul planning stagiaire (bleus auto)
src/lib/utils/inscriptions.ts              — règles métier inscriptions
src/lib/utils/import.ts                    — parse CSV/XLSX + pipeline import
src/lib/utils/export.ts                    — helpers PDF + Excel
src/contexts/AuthContext.tsx               — Firebase auth state + profil user
src/hooks/useAuth.ts                       — login, logout, currentUser
src/hooks/useTemps.ts                      — listener Firestore temps
src/hooks/useInscriptions.ts              — listener Firestore inscriptions
src/hooks/usePresences.ts                  — listener Firestore presences
src/services/users.ts                      — CRUD Firestore users
src/services/temps.ts                      — CRUD Firestore temps
src/services/creneaux.ts                   — CRUD Firestore creneaux
src/services/ateliers.ts                   — CRUD Firestore ateliers
src/services/inscriptions.ts              — transactions Firestore inscriptions
src/services/presences.ts                  — CRUD Firestore presences
src/services/historique.ts                 — writes Firestore historique
src/app/layout.tsx                         — root layout (AuthProvider)
src/app/(auth)/login/page.tsx             — page login
src/app/(stagiaire)/layout.tsx             — guard rôle stagiaire
src/app/(stagiaire)/dashboard/page.tsx    — dashboard stagiaire
src/app/(formateur)/layout.tsx             — guard rôle formateur
src/app/(formateur)/dashboard/page.tsx    — dashboard formateur
src/app/(admin)/layout.tsx                 — guard rôle admin
src/app/(admin)/dashboard/page.tsx        — dashboard admin
src/components/planning/PlanningView.tsx   — vue planning par jour
src/components/planning/CreneauCard.tsx    — card créneau
src/components/planning/TempsCard.tsx      — card temps + action
src/components/presence/PresenceList.tsx   — liste stagiaires + cases
src/components/admin/UserManager.tsx       — gestion utilisateurs
src/components/admin/TempsManager.tsx      — gestion temps/créneaux
src/components/admin/InscriptionsManager.tsx — vue matricielle
src/components/admin/ImportPanel.tsx       — upload + preview + confirmation
src/components/admin/ExportPanel.tsx       — boutons export PDF/Excel
firestore.rules                            — règles sécurité Firestore
firebase.json                              — config Firebase Hosting
.env.local.example                         — template variables env
.github/workflows/ci.yml                   — pipeline CI/CD
tests/e2e/                                 — tests Playwright
```

---

## Task 1 — Init projet Next.js

**Objectif:** Projet Next.js avec toutes les dépendances, shadcn/ui initialisé, Vitest configuré.

- [ ] Depuis `C:\Users\ethan\Documents\Projet\BAFAALAKART`, initialiser Next.js dans le dossier courant :
  ```
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
  ```
- [ ] Installer les dépendances :
  ```
  npm install firebase xlsx jspdf jspdf-autotable
  npm install -D vitest @vitest/ui @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
  npm install -D playwright @playwright/test
  ```
- [ ] Init shadcn/ui : `npx shadcn@latest init` (style Default, base color Slate, CSS variables oui)
- [ ] Ajouter composants shadcn : `npx shadcn@latest add button card badge checkbox input label tabs alert select dialog table`
- [ ] Créer `vitest.config.ts` :
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import path from 'path'
  export default defineConfig({
    plugins: [react()],
    test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], globals: true },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  })
  ```
- [ ] Créer `src/test/setup.ts` : `import '@testing-library/jest-dom'`
- [ ] Ajouter dans `package.json` scripts : `"test": "vitest", "test:e2e": "playwright test"`
- [ ] Créer `.env.local.example` avec les 6 variables `NEXT_PUBLIC_FIREBASE_*`
- [ ] Créer `.env.local` en copiant `.env.local.example` (sera rempli à Task 3)
- [ ] `git add -A && git commit -m "feat: init Next.js project with full stack"`

---

## Task 2 — Types TypeScript partagés

**Objectif:** Fichier `src/types/index.ts` avec tous les types. Zéro `any`.

- [ ] Créer `src/types/index.ts` avec les types pour : `UserRole`, `TypeStagiaire`, `TypeTemps`, `OrigineInscription`, `User`, `Session`, `Creneau`, `Temps`, `Atelier`, `Inscription`, `Presence`, `HistoriqueEntry`
- [ ] Tous les champs correspondent exactement au modèle Firestore du spec
- [ ] `git commit -m "feat: add shared TypeScript types"`

**Points clés:**
- `role: 'stagiaire' | 'formateur' | 'admin'`
- `typeStagiaire?: 'Base' | 'Approfondissement'`
- `type: 'bleu' | 'orange' | 'violet' | 'sans_formation'`
- `origine: 'auto' | 'choix' | 'admin'`
- Tous les Timestamps Firestore typés comme `import { Timestamp } from 'firebase/firestore'`

---

## Task 3 — Config Firebase

**Objectif:** Firebase initialisé, singleton auth+db, variables d'env.

- [ ] Créer le projet Firebase sur console.firebase.google.com : activer Auth (email/password), Firestore (mode production)
- [ ] Copier les clés dans `.env.local`
- [ ] Créer `src/lib/firebase/config.ts` : `initializeApp` avec guard singleton (`getApps().length`), exporter `auth` et `db`
- [ ] Créer `firebase.json` et `.firebaserc` pour Firebase Hosting (public: `out`, rewrites SPA)
- [ ] `git commit -m "feat: add Firebase configuration"`

---

## Task 4 — Auth utilities (TDD)

**Objectif:** Logique pure de génération d'identifiants et mots de passe, testée.

**Fichiers:** `src/lib/auth/identifiant.ts`, `src/lib/auth/password.ts`, `src/lib/auth/__tests__/identifiant.test.ts`, `src/lib/auth/__tests__/password.test.ts`

- [ ] Tests `identifiant.test.ts` : normalisation accents (é→e, ç→c), minuscules, format `prenom[0]+nom`, dédup avec suffixe
- [ ] Implémenter `generateIdentifiant(prenom, nom, existants: string[]): string`
  - Normaliser : `str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`
  - Format : `prenom[0] + nom` (sans espaces ni tirets)
  - Si doublon dans `existants` : ajouter `1`, `2`, etc.
- [ ] Tests `password.test.ts` : longueur 12, alphanumérique, entropie (pas toujours identique)
- [ ] Implémenter `generatePassword(): string` (12 chars, charset alphanumérique, `crypto.getRandomValues`)
- [ ] `npm test` → vert
- [ ] `git commit -m "feat: auth utilities with tests"`

---

## Task 5 — AuthContext + useAuth

**Objectif:** Context Firebase auth avec profil Firestore, hook simple.

**Fichiers:** `src/contexts/AuthContext.tsx`, `src/hooks/useAuth.ts`

- [ ] `AuthContext.tsx` :
  - `onAuthStateChanged` → si user, charger `users/{uid}` depuis Firestore → stocker `User` complet
  - Exposer : `currentUser: User | null`, `loading: boolean`, `login(identifiant, password)`, `logout()`
  - `login` : `signInWithEmailAndPassword(auth, \`${identifiant}@bafaalakart.app\`, password)`
- [ ] `useAuth.ts` : simple wrapper `useContext(AuthContext)`
- [ ] Wrapper `src/app/layout.tsx` avec `<AuthProvider>`
- [ ] `git commit -m "feat: AuthContext and useAuth hook"`

---

## Task 6 — Page Login

**Objectif:** Page `/login` fonctionnelle, mobile-first.

**Fichier:** `src/app/(auth)/login/page.tsx`

- [ ] Formulaire : champ "Identifiant" + champ "Mot de passe" (type password)
- [ ] Submit → `login(identifiant, password)` → redirect selon `currentUser.role`
- [ ] Afficher erreur en cas d'échec (message générique "Identifiant ou mot de passe incorrect")
- [ ] Aucun email visible nulle part
- [ ] Style : centré verticalement, max-w-sm, card shadcn
- [ ] Redirect logique : `stagiaire` → `/dashboard`, `formateur` → `/formateur`, `admin` → `/admin`
- [ ] `git commit -m "feat: login page"`

---

## Task 7 — Route Guards (layouts)

**Objectif:** Chaque groupe de routes vérifie le rôle, redirige sinon.

**Fichiers:** `src/app/(stagiaire)/layout.tsx`, `src/app/(formateur)/layout.tsx`, `src/app/(admin)/layout.tsx`

- [ ] Chaque layout : si `loading` → spinner, si `!currentUser` → redirect `/login`, si `role !== attendu` → redirect `/login`
- [ ] Layout stagiaire accepte rôle `stagiaire` uniquement
- [ ] Layout formateur accepte rôles `formateur` ET `admin`
- [ ] Layout admin accepte rôle `admin` uniquement
- [ ] `src/app/page.tsx` : redirect vers `/login` (root → login)
- [ ] `git commit -m "feat: role-based route guards"`

---

## Task 8 — Services Firestore (lecture/écriture de base)

**Objectif:** Couche service pour toutes les collections sauf inscriptions/présences.

**Fichiers:** `src/services/users.ts`, `src/services/temps.ts`, `src/services/creneaux.ts`, `src/services/ateliers.ts`, `src/services/historique.ts`

- [ ] `users.ts` : `getUser(uid)`, `getUserByIdentifiant(id)`, `listUsers()`, `listStagiaires()`, `listFormateurs()`, `updateUser(uid, data)`, `setUserPassword` (via secondaryApp + updatePassword)
- [ ] `creneaux.ts` : `listCreneaux()`, `createCreneau(data)`, `updateCreneau(id, data)`, `deleteCreneau(id)`
- [ ] `temps.ts` : `listTemps()`, `getTemp(id)`, `createTemps(data)`, `updateTemps(id, data)`, `deleteTemps(id)`, `listTempsByCreneau(creneauId)`, `listTempsByAtelier(atelierId)`
- [ ] `ateliers.ts` : `listAteliers()`, `createAtelier(data)`, `updateAtelier(id, data)`, `deleteAtelier(id)`
- [ ] `historique.ts` : `addHistorique(action, utilisateurId, details)`
- [ ] `git commit -m "feat: Firestore base services"`

---

## Task 9 — Business logic utils (TDD)

**Objectif:** Règles métier pures testées sans Firebase.

**Fichiers:** `src/lib/utils/planning.ts`, `src/lib/utils/inscriptions.ts`, tests associés

- [ ] Tests `planning.test.ts` :
  - temps bleu `obligatoireBase=true` apparaît pour stagiaire `Base`
  - temps bleu `obligatoireAppro=false` n'apparaît pas pour stagiaire `Base`
  - `getTempsVisiblesParStagiaire(temps[], typeStagiaire)` retourne bons temps
- [ ] Implémenter `getTempsVisiblesParStagiaire`
- [ ] Tests `inscriptions.test.ts` :
  - `peutSInscrire` retourne false si créneau déjà occupé
  - `peutSInscrire` retourne false si inscription verrouillée
  - `peutSInscrire` retourne true sinon
  - `peutQuitter` retourne false si `verrouille=true`
- [ ] Implémenter `peutSInscrire(stagiaireId, creneauId, inscriptions[])` et `peutQuitter(inscription)`
- [ ] `npm test` → vert
- [ ] `git commit -m "feat: business logic utils with tests"`

---

## Task 10 — Service inscriptions (transactions Firestore)

**Objectif:** Inscriptions avec transactions atomiques pour éviter les race conditions.

**Fichier:** `src/services/inscriptions.ts`

- [ ] `getInscriptionsStagiaire(stagiaireId)` — listener ou one-shot
- [ ] `getInscriptionsTemps(tempsId)` — pour formateurs/admin
- [ ] `inscrire(stagiaireId, tempsId, creneauId)` — transaction :
  1. Lire toutes les inscriptions du stagiaire pour ce créneau
  2. Si existante → throw `'CRENEAU_OCCUPE'`
  3. Écrire nouvelle inscription `{origine: 'choix', verrouille: false}`
  4. Écrire historique
- [ ] `inscrireAtelier(stagiaireId, atelierId)` — transaction multi-docs :
  1. Charger tous les temps de l'atelier
  2. Pour chaque temps : vérifier créneau libre
  3. Si conflit → throw `'CONFLIT_ATELIER'`
  4. Écrire toutes les inscriptions `{origine: 'auto', verrouille: true}`
  5. Écrire historique
- [ ] `desinscrire(inscriptionId)` — vérifie `!verrouille`, supprime, historique
- [ ] `desinscireAdmin(inscriptionId)` — supprime sans vérif verrou, historique
- [ ] `inscrireAdmin(stagiaireId, tempsId)` — inscrit sans contrainte créneau
- [ ] `git commit -m "feat: inscriptions service with Firestore transactions"`

---

## Task 11 — Service présences

**Objectif:** Validation présences avec enregistrement du formateur.

**Fichier:** `src/services/presences.ts`

- [ ] `getPresencesTemps(tempsId)` — toutes les présences d'un temps
- [ ] `validerPresence(stagiaireId, tempsId, formateurId)` :
  1. Upsert `presences/{stagiaireId}_{tempsId}` avec `{present: true, validePar: formateurId, dateValidation: now}`
  2. Update `inscriptions` correspondante : `{verrouille: true}`
  3. Écrire historique
- [ ] `annulerPresence(stagiaireId, tempsId, formateurId)` : set `present: false`, ne déverrouille PAS l'inscription
- [ ] `git commit -m "feat: presences service"`

---

## Task 12 — Hooks Firestore real-time

**Objectif:** Hooks avec `onSnapshot` pour réactivité temps réel.

**Fichiers:** `src/hooks/useTemps.ts`, `src/hooks/useInscriptions.ts`, `src/hooks/usePresences.ts`

- [ ] `useTemps()` → `{ temps: Temps[], creneaux: Creneau[], ateliers: Atelier[], loading }`
- [ ] `useInscriptions(stagiaireId?)` → `{ inscriptions: Inscription[], loading }` (all si admin, filtrées si stagiaire)
- [ ] `usePresences(tempsId)` → `{ presences: Presence[], loading }`
- [ ] Cleanup `onSnapshot` dans useEffect return
- [ ] `git commit -m "feat: real-time Firestore hooks"`

---

## Task 13 — Dashboard Stagiaire

**Objectif:** Planning interactif + vue ateliers.

**Fichiers:** `src/app/(stagiaire)/dashboard/page.tsx`, `src/components/planning/PlanningView.tsx`, `src/components/planning/CreneauCard.tsx`, `src/components/planning/TempsCard.tsx`

- [ ] Navigation bas d'écran : "Planning" | "Mes Ateliers"
- [ ] `PlanningView` : regrouper créneaux par jour, trier par `ordre`, afficher les 8 jours (12-19 juillet)
- [ ] `TempsCard` :
  - Bleu : badge "Obligatoire" bleu, non interactif
  - Orange : bouton "Rejoindre"/"Quitter" (désactivé si verrouillé)
  - Violet : badge "Atelier" violet, cadenas si verrouillé
  - Sans formation : gris, non interactif
  - Alerte si temps orange est le seul dans un créneau déjà pris
- [ ] Vue "Mes Ateliers" : liste des ateliers violets avec leurs créneaux
- [ ] `git commit -m "feat: stagiaire dashboard"`

---

## Task 14 — Dashboard Formateur

**Objectif:** Vue temps + appel de présences.

**Fichiers:** `src/app/(formateur)/dashboard/page.tsx`, `src/components/presence/PresenceList.tsx`

- [ ] Navigation : "Temps" | "Présences"
- [ ] Filtre jour en haut (boutons des 8 jours)
- [ ] Vue Temps : liste des temps du jour, badge nombre d'inscrits, badge rouge "< 4 participants" si insuffisant
- [ ] Vue Présences : sélecteur de temps → `PresenceList`
- [ ] `PresenceList` : liste stagiaires inscrits, checkbox par stagiaire, bouton "Valider" → `validerPresence`
- [ ] Afficher l'heure et le nom du formateur ayant validé si déjà signé
- [ ] `git commit -m "feat: formateur dashboard"`

---

## Task 15 — Dashboard Admin — Utilisateurs + Temps

**Objectif:** CRUD utilisateurs, créneaux, temps, ateliers.

**Fichiers:** `src/app/(admin)/dashboard/page.tsx`, `src/components/admin/UserManager.tsx`, `src/components/admin/TempsManager.tsx`

- [ ] Navigation admin : tabs "Utilisateurs" | "Temps" | "Inscriptions" | "Import" | "Export"
- [ ] `UserManager` : table avec nom, prénom, identifiant, rôle, type. Boutons modifier/supprimer. Dialog de modification.
- [ ] `TempsManager` : liste créneaux avec leurs temps. CRUD complet. Gestion ateliers (associer plusieurs temps violets à un atelier).
- [ ] `git commit -m "feat: admin dashboard - users and temps management"`

---

## Task 16 — Dashboard Admin — Inscriptions

**Objectif:** Vue et modification manuelle des inscriptions.

**Fichier:** `src/components/admin/InscriptionsManager.tsx`

- [ ] Vue par stagiaire : accordion par stagiaire → liste de ses inscriptions avec créneau + temps
- [ ] Actions : "Déplacer" (sélectionner autre temps du même créneau), "Supprimer", "Ajouter"
- [ ] Dialog "Déplacer" : sélecteur de temps disponibles pour ce créneau
- [ ] Alerte rouge sur chaque temps avec < 4 participants
- [ ] `git commit -m "feat: admin inscriptions management"`

---

## Task 17 — Import CSV/XLSX

**Objectif:** Pipeline complet import depuis fichier Google Sheets exporté.

**Fichiers:** `src/lib/utils/import.ts`, `src/components/admin/ImportPanel.tsx`

- [ ] `import.ts` :
  - `parseFile(file: File): Promise<Row[]>` via `xlsx.read`
  - `validateStagiaires(rows)` : colonnes Nom, Prénom, Type présentes + valeurs Type valides
  - `validateFormateurs(rows)` : colonnes Nom, Prénom présentes
  - `buildImportPlan(rows, role, existingIdentifiants)` : génère identifiant + password pour chaque ligne
- [ ] `ImportPanel` :
  1. Sélecteur de type (Stagiaires / Formateurs)
  2. Upload fichier
  3. Preview tableau (nom, prénom, identifiant généré, mdp masqué)
  4. Bouton "Confirmer l'import"
  5. Progress bar pendant import
  6. À la fin : download automatique du CSV récapitulatif (nom, prénom, identifiant, mot de passe)
- [ ] Création comptes Firebase via `secondaryApp` trick (évite de déconnecter l'admin) :
  ```ts
  const secondary = initializeApp(firebaseConfig, `import_${Date.now()}`)
  const secondaryAuth = getAuth(secondary)
  await createUserWithEmailAndPassword(secondaryAuth, email, password)
  await deleteApp(secondary)
  ```
- [ ] Batch Firestore par chunks de 499
- [ ] `git commit -m "feat: CSV/XLSX import pipeline"`

---

## Task 18 — Export PDF + Excel

**Objectif:** Exports téléchargeables depuis le dashboard admin.

**Fichiers:** `src/lib/utils/export.ts`, `src/components/admin/ExportPanel.tsx`

- [ ] `exportListesPDF()` : une page par temps, tableau nom/prénom stagiaires inscrits
- [ ] `exportPresencesPDF()` : feuilles de présence (colonnes : stagiaire | présent ✓ | absent ✗ | validé par | heure)
- [ ] `exportExcel()` : workbook xlsx avec 4 feuilles (stagiaires, formateurs, inscriptions, présences)
- [ ] `ExportPanel` : boutons "Liste par temps (PDF)", "Feuilles de présence (PDF)", "Export complet (Excel)"
- [ ] Spinner pendant génération
- [ ] `git commit -m "feat: PDF and Excel exports"`

---

## Task 19 — Règles Firestore

**Objectif:** Sécurité Firestore selon les rôles.

**Fichier:** `firestore.rules`

- [ ] Helpers : `isAuth()`, `isAdmin()`, `isFormateur()`, `isStagiaire()`, `getRole()`
- [ ] `users` : lecture own doc = auth, lecture all = formateur+admin, écriture = admin only
- [ ] `temps`, `creneaux`, `ateliers`, `session` : lecture = auth, écriture = admin only
- [ ] `inscriptions` : lecture = own stagiaire + formateur + admin, écriture own = stagiaire (si !verrouille), écriture all = admin
- [ ] `presences` : lecture = formateur + admin, écriture = formateur + admin
- [ ] `historique` : lecture = admin, écriture = auth
- [ ] `firebase deploy --only firestore:rules`
- [ ] `git commit -m "feat: Firestore security rules"`

---

## Task 20 — Seed admin + session

**Objectif:** Script pour créer le compte admin et la session.

**Fichier:** `scripts/seed.ts`

- [ ] Créer compte admin : identifiant `elepareur`, email `elepareur@bafaalakart.app`, password généré
- [ ] Créer document `users/{uid}` avec `role: 'admin'`
- [ ] Créer document `session/current` : nom "BAFA À LA CARTE", lieu "Argentan", dateDebut 2026-07-12, dateFin 2026-07-19
- [ ] Script exécutable avec `npx ts-node scripts/seed.ts`
- [ ] `git commit -m "feat: seed script for admin and session"`

---

## Task 21 — Tests E2E Playwright

**Objectif:** Tests E2E sur les flux critiques avec Firebase Emulator.

**Fichiers:** `playwright.config.ts`, `tests/e2e/*.spec.ts`, `firebase.json` (emulators)

- [ ] Configurer Firebase Emulator dans `firebase.json` (auth port 9099, firestore port 8080)
- [ ] `playwright.config.ts` : baseURL `http://localhost:3000`, webServer next dev
- [ ] `tests/e2e/auth.spec.ts` : login stagiaire, formateur, admin → bon dashboard
- [ ] `tests/e2e/stagiaire.spec.ts` : choisir temps orange → visible en planning ; choisir atelier violet → tous créneaux bloqués
- [ ] `tests/e2e/formateur.spec.ts` : valider présence → badge verrouillé côté stagiaire
- [ ] `tests/e2e/admin.spec.ts` : import CSV → comptes créés ; export Excel → fichier téléchargé
- [ ] `git commit -m "feat: E2E tests with Playwright"`

---

## Task 22 — CI/CD GitHub Actions

**Objectif:** Pipeline automatique lint → tests → build → deploy.

**Fichier:** `.github/workflows/ci.yml`

- [ ] Job `ci` (sur push + PR) :
  ```yaml
  - npm ci
  - npx tsc --noEmit
  - npx eslint src/
  - npx vitest run
  - npx firebase emulators:exec "npx playwright test" --only auth,firestore
  - npm run build
  ```
- [ ] Job `deploy` (sur push main uniquement, needs ci) :
  ```yaml
  - firebase deploy --only hosting
  ```
- [ ] Secrets GitHub : `FIREBASE_TOKEN` + toutes les vars `NEXT_PUBLIC_FIREBASE_*`
- [ ] `git commit -m "feat: GitHub Actions CI/CD pipeline"`

---

## Ordre d'exécution recommandé

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22

**Points critiques à ne pas rater :**
- Task 4 : `secondaryApp` trick pour import (sinon l'admin est déconnecté)
- Task 10 : transactions Firestore pour inscriptions et ateliers violets
- Task 11 : `validerPresence` doit verrouiller l'inscription en même temps
- Task 19 : déployer les règles Firestore AVANT de tester en production
