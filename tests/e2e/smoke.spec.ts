import { test, expect } from '@playwright/test'

test.describe('Structure de base', () => {
  test('La racine redirige vers /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })

  test('La page /login contient le formulaire BAFA', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/BAFA à la carte/i)).toBeVisible()
    await expect(page.getByText(/Argentan/i)).toBeVisible()
  })

  test('Les routes protégées redirigent vers /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })
})
