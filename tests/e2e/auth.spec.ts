import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {
  test('La page login est accessible', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByLabel('Identifiant')).toBeVisible()
    await expect(page.getByLabel('Mot de passe')).toBeVisible()
  })

  test('Identifiants incorrects affichent une erreur', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Identifiant').fill('userquinexiste pas')
    await page.getByLabel('Mot de passe').fill('wrongpassword')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText(/identifiant ou mot de passe incorrect/i)).toBeVisible({ timeout: 10000 })
  })
})
