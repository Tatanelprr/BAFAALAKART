# Spec — Wizard de planning initial (stagiaire)

## Contexte

À leur première utilisation, les stagiaires n'ont aucune inscription. Il faut les guider pour construire leur planning en s'assurant que tous les temps bleus obligatoires (selon leur type Base/Approfondissement) sont couverts au moins une fois. Une fois le planning complet, ils accèdent au planning normal avec la possibilité de changer leurs choix.

## Trigger du wizard

Dans `DashboardStagiaire`, après chargement complet (`!loading`) :

- `inscriptions.length < creneaux.length` → affiche `<OnboardingWizard>`
- `inscriptions.length === creneaux.length` → affiche le planning normal

Le wizard est donc visible à la première connexion ET si le planning est incomplet (ex. le stagiaire a commencé mais n'a pas tout rempli).

## Composant `OnboardingWizard`

**Fichier :** `src/components/stagiaire/OnboardingWizard.tsx`

**Props :**
```ts
interface Props {
  creneaux: Creneau[]
  temps: Temps[]
  ateliers: Atelier[]
  inscriptions: Inscription[]   // existantes, pour pré-remplissage
  stagiaireId: string
  typeStagiaire: TypeStagiaire
}
```

**État local :**
```ts
const [selections, setSelections] = useState<Record<string, string>>({})
// creneauId → tempsId, initialisé depuis inscriptions existantes
```

**Structure UI (scrollable) :**

1. **Sticky header** — titre + barre de progression des bleus couverts
2. **Corps** — créneaux groupés par jour (ISO `jour` trié), pour chaque créneau : radio cards des temps disponibles
3. **Sticky footer** — bouton "Valider mon planning" + message d'alerte si bleus manquants

**Couverture des bleus :**

- Filtrer les `Temps` où `type === 'bleu'` ET (`obligatoireBase` si Base, `obligatoireAppro` si Appro)
- Grouper par `nom` → chaque groupe = un topic obligatoire
- Un topic est couvert si au moins une `tempsId` sélectionnée (dans `selections`) appartient à ce groupe
- Le bouton "Valider" est désactivé tant que tous les topics ne sont pas couverts

**Pré-remplissage :**

À l'initialisation, parcourir les `inscriptions` existantes et peupler `selections` :
```ts
inscriptions.forEach(i => {
  selections[i.creneauId] = i.tempsId
})
```

**Soumission :**

- Le bouton "Valider" est activé dès que tous les bleus obligatoires sont couverts, même si certains créneaux sont laissés vides.
- Pour chaque `[creneauId, tempsId]` dans `selections` :
  - Si une inscription existe déjà pour ce créneau → skip (déjà dans Firestore)
  - Sinon : si `temps.type === 'violet' && temps.atelierId` → `inscrireAtelier()`, sinon → `inscrire()`
- Après soumission : les inscriptions Firestore se propagent via le hook temps réel → si `inscriptions.length === creneaux.length`, le wizard disparaît automatiquement. Sinon il réapparaît avec les créneaux restants pré-vides (le stagiaire peut compléter plus tard).

## Modifications du planning normal

**Fichier :** `src/components/planning/PlanningView.tsx` et `TempsCard.tsx`

**Nouveaux états visuels pour une card temps :**

| Situation | Badge | Bouton |
|---|---|---|
| Inscrit (non verrouillé) | "Temps choisi" (vert) | "Changer" |
| Inscrit (verrouillé) | "Temps choisi" + "Verrouillé" | désactivé |
| Non inscrit, créneau libre | — | "S'inscrire" (comportement actuel) |
| Non inscrit, créneau occupé | — | "Changer" (sur l'autre temps) |

**Logique "Changer de temps" :**

Swap atomique dans le handler `onChanger(inscriptionId, newTempsId, creneauId)` :
1. `desinscrire(inscriptionId, stagiaireId, creneauId)`
2. `inscrire(stagiaireId, newTempsId, creneauId)` (ou `inscrireAtelier` si violet)

En cas d'erreur sur l'étape 2, afficher le message d'erreur existant (même système que le dashboard actuel).

## Logout stagiaire

Ajout d'un bouton "Déconnexion" dans le header de `DashboardStagiaire`, à côté du bouton "Mot de passe". Utilise le même `logout()` du hook `useAuth` que le dashboard admin.

## Ce qui ne change pas

- Services `inscrire`, `desinscrire`, `inscrireAtelier` — inchangés
- Règles Firestore — inchangées
- Hook `useInscriptions` — inchangé
- Dashboard formateur et admin — inchangés

## Hors scope

- Validation que les temps bleus sont physiquement possibles à couvrir sans conflit (détection de deadlock)
- Notification si un créneau n'a aucun temps disponible
- Configuration des champs `obligatoireBase`/`obligatoireAppro` (déjà prévu côté admin, liste à recevoir)
