import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { urlRegisto } from '../ports.js';

const url = `${urlRegisto}/`;

test('a página abre e mostra a API ligada', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Registo Diário' })).toBeVisible();
  await expect(page.getByText('API ligada')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});

test('abre sem rede depois da primeira visita e mostra "API sem ligação"', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    'Limitação do Playwright no Firefox: o setOffline não se aplica ao reload (o documento e a API chegam pela rede). O alvo do Registo Diário é o iPad (WebKit), onde o teste passa. Relacionado: https://github.com/microsoft/playwright/issues/37295',
  );
  await page.goto(url);
  await expect(page.getByText('API ligada')).toBeVisible();

  // Espera que o service worker esteja ativo e a controlar a página (recarrega uma vez se preciso).
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) {
    await page.reload();
  }
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Registo Diário' })).toBeVisible();
  await expect(page.getByText('API sem ligação')).toBeVisible();
});
