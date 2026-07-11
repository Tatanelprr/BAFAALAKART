import { Inscription } from '@/types'

export function peutSInscrire(
  stagiaireId: string,
  creneauId: string,
  inscriptions: Inscription[],
  tempsCreneauMap: Record<string, string> = {}
): boolean {
  const inscriptionsDuStagiaire = inscriptions.filter(i => i.stagiaireId === stagiaireId)
  return !inscriptionsDuStagiaire.some(i => tempsCreneauMap[i.tempsId] === creneauId)
}

export function peutQuitter(inscription: Inscription): boolean {
  return !inscription.verrouille
}
