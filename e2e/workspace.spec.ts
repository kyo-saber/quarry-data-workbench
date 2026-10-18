import path from 'node:path'
import { expect, test } from '@playwright/test'

test('loads the local analytics workspace', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Quarry' })).toBeVisible()
  await expect(page.getByText('Northstar shop')).toBeVisible()
  await expect(page.getByText('Local session')).toBeVisible()
  await expect(page.locator('.source-row')).toHaveCount(3)
  await expect(page.locator('.data-table tbody tr')).toHaveCount(12)
  await expect(page.locator('.metric-strip')).toBeVisible()
  await expect(page.locator('.recharts-wrapper svg')).toBeVisible()
})

test('edits and runs SQL with the keyboard shortcut', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('.cm-content')
  await expect(page.locator('.data-table tbody tr')).toHaveCount(12)

  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText('SELECT 21 * 2 AS answer')
  await page.keyboard.press('Control+Enter')

  await expect(page.locator('.data-table thead')).toContainText('answer')
  await expect(page.locator('.data-table tbody tr').first()).toContainText('42')

  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText('SELECT * FROM missing_table')
  await page.getByRole('button', { name: 'Run query' }).click()

  await expect(page.getByText('Query failed')).toBeVisible()
  await expect(page.locator('.query-error')).toContainText('missing_table')
})

test('runs a saved query and saves the current SQL', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.data-table tbody tr')).toHaveCount(12)

  await page.getByRole('button', { name: /Top products/ }).click()
  await expect(page.locator('.data-table thead')).toContainText('product_name')
  await expect(page.locator('.data-table tbody tr')).toHaveCount(10)

  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Query name').fill('Product leaderboard')
  await page.getByRole('button', { name: 'Save query' }).click()

  await expect(page.getByText('Query saved in this browser')).toBeVisible()
  await expect(page.getByRole('button', { name: /Product leaderboard/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: /Product leaderboard/ })).toBeVisible()
})

test('imports and removes a CSV without a server', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.source-row')).toHaveCount(3)

  await page.locator('input[type="file"]').setInputFiles(
    path.resolve('public/sample-campaign.csv'),
  )

  await expect(page.locator('.source-row')).toHaveCount(4)
  await expect(page.getByText('sample_campaign', { exact: true })).toBeVisible()
  await expect(page.locator('.data-table thead')).toContainText('conversion_rate')
  await expect(page.locator('.data-table tbody tr')).toHaveCount(12)

  await page.reload()
  await expect(page.locator('.source-row')).toHaveCount(4)

  const importedRow = page.locator('.source-row').filter({ hasText: 'sample_campaign' })
  await importedRow.hover()
  await page.getByRole('button', { name: 'Remove sample_campaign' }).click()
  await page.getByRole('button', { name: 'Remove source' }).click()

  await expect(page.locator('.source-row')).toHaveCount(3)
})

test('keeps the mobile workbench within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.insight-pane')).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)

  await page.getByRole('button', { name: /Results/ }).click()
  await expect(page.locator('.table-pane')).toBeVisible()

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.locator('.sidebar')).toHaveClass(/open/)
})
