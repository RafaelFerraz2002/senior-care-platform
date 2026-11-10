import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { urlGestao } from '../ports.js';

test('a página abre e mostra a API ligada', async ({ page }) => {
  await page.goto(`${urlGestao}/`);
  await expect(page.getByRole('heading', { name: /Gestão/ })).toBeVisible();
  await expect(page.getByText('API ligada')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(graves).toEqual([]);
});
