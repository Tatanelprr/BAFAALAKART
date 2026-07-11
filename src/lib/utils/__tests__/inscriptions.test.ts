import { describe, it, expect } from 'vitest'
import { peutSInscrire, peutQuitter } from '../inscriptions'
import { Inscription } from '@/types'
import { Timestamp } from 'firebase/firestore'

const makeInscription = (overrides: Partial<Inscription>): Inscription => ({
  id: '1',
  stagiaireId: 'stagiaire1',
  tempsId: 'temps1',
  dateCreation: Timestamp.now(),
  origine: 'choix',
  verrouille: false,
  ...overrides,
})

describe('peutSInscrire', () => {
  it('retourne true si aucune inscription pour ce créneau', () => {
    expect(peutSInscrire('stagiaire1', 'creneau1', [])).toBe(true)
  })

  it('retourne false si le stagiaire a déjà une inscription dans ce créneau', () => {
    const inscriptions = [
      makeInscription({ stagiaireId: 'stagiaire1', tempsId: 'autreTemps', verrouille: false }),
    ]
    // On passe aussi le creneauId des temps existants — simulé via la signature étendue
    expect(peutSInscrire('stagiaire1', 'creneau1', inscriptions, { autreTemps: 'creneau1' })).toBe(false)
  })

  it('retourne true si inscription dans un autre créneau', () => {
    const inscriptions = [
      makeInscription({ stagiaireId: 'stagiaire1', tempsId: 'autreTemps', verrouille: false }),
    ]
    expect(peutSInscrire('stagiaire1', 'creneau1', inscriptions, { autreTemps: 'autrecreneau' })).toBe(true)
  })

  it('retourne false si inscription dans ce créneau est verrouillée', () => {
    const inscriptions = [
      makeInscription({ stagiaireId: 'stagiaire1', tempsId: 'autreTemps', verrouille: true }),
    ]
    expect(peutSInscrire('stagiaire1', 'creneau1', inscriptions, { autreTemps: 'creneau1' })).toBe(false)
  })
})

describe('peutQuitter', () => {
  it('retourne true si inscription non verrouillée', () => {
    expect(peutQuitter(makeInscription({ verrouille: false }))).toBe(true)
  })

  it('retourne false si inscription verrouillée', () => {
    expect(peutQuitter(makeInscription({ verrouille: true }))).toBe(false)
  })
})
