# BAFAALAKART

Application web de gestion de stage BAFA/BAFD — planning, inscriptions, présences et suivi des temps obligatoires.

## Fonctionnalités

### Stagiaires
- Wizard d'inscription guidé au premier accès
- Planning personnalisé par créneaux (filtré selon le type Base / Approfondissement)
- Changement de temps en autonomie (bloqué si inscription verrouillée)
- Checklist des temps bleus obligatoires avec suivi des groupes "1 parmi"
- Onglet **Ateliers** pour visualiser ses sessions d'atelier violet
- Onglet **Passé** listant les temps validés par présence

### Formateurs
- Faire l'appel par jour et par temps
- Vue des temps du jour avec alerte si moins de 4 inscrits
- Accès au panel admin en lecture/écriture limitée

### Administrateurs
- Gestion des utilisateurs (création via import CSV, modification, suppression)
- Gestion des temps et créneaux (CRUD complet)
- Configuration des temps bleus obligatoires (`obligatoireBase`, `obligatoireAppro`, groupes)
- Panel inscriptions avec ajout/suppression par stagiaire
- Import CSV en masse
- Export des données (présences, inscriptions)

## Stack technique

| Couche | Outil |
|---|---|
| Framework | Next.js 15 (App Router) |
| Base de données | Firebase Firestore |
| Authentification | Firebase Auth (email synthétique `identifiant@bafaalakart.app`) |
| UI | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Langage | TypeScript |

## Architecture Firestore

| Collection | Description |
|---|---|
| `users` | Profils utilisateurs (rôle, type stagiaire, identifiant) |
| `temps` | Temps de formation (type, créneau, obligations, atelier) |
| `creneaux` | Créneaux horaires (jour ISO, heureDebut/Fin, ordre) |
| `ateliers` | Ateliers violets regroupant plusieurs temps |
| `inscriptions` | Inscriptions stagiaire ↔ temps (origine, verrouille) |
| `slots` | Document `stagiaireId_creneauId` garantissant l'unicité en transaction |
| `presences` | Présences validées par les formateurs |
| `historique` | Journal des actions (création, suppression, présences) |

## Types de temps

| Couleur | Signification |
|---|---|
| Bleu | Temps de formation (peut être obligatoire) |
| Orange | Temps encadré non obligatoire |
| Violet | Atelier multi-créneaux (inscription groupée) |
| Sans formation | Temps libre |

## Lancer le projet en local

```bash
npm install
npm run dev
```

Créer un fichier `.env.local` avec les clés Firebase :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Rôles et accès

| Rôle | Accès |
|---|---|
| `stagiaire` | Dashboard personnel (planning, ateliers, bleus, passé) |
| `formateur` | Appel + panel admin (onglets Temps, Inscriptions, Export) |
| `admin` | Accès complet |
