import { describe, it, expect } from 'vitest'
import { generateIdentifiant } from '../identifiant'

describe('generateIdentifiant', () => {
  it('retourne prenom[0] + nom en minuscules', () => {
    expect(generateIdentifiant('Jean', 'Dupont', [])).toBe('jdupont')
  })

  it('normalise les accents', () => {
    expect(generateIdentifiant('Élodie', 'Lefèvre', [])).toBe('elefevre')
  })

  it('normalise ç', () => {
    expect(generateIdentifiant('François', 'Garçon', [])).toBe('fgarcon')
  })

  it('supprime les espaces dans le nom', () => {
    expect(generateIdentifiant('Jean', 'Le Brun', [])).toBe('jlebrun')
  })

  it('supprime les tirets dans le nom', () => {
    expect(generateIdentifiant('Marie', 'Martin-Dupont', [])).toBe('mmartindupont')
  })

  it('ajoute suffixe 1 si doublon', () => {
    expect(generateIdentifiant('Julie', 'Dupont', ['jdupont'])).toBe('jdupont1')
  })

  it('ajoute suffixe 2 si doublon 1 existe aussi', () => {
    expect(generateIdentifiant('Jacques', 'Dupont', ['jdupont', 'jdupont1'])).toBe('jdupont2')
  })

  it('fonctionne avec prénom composé', () => {
    expect(generateIdentifiant('Jean-Pierre', 'Martin', [])).toBe('jmartin')
  })
})
