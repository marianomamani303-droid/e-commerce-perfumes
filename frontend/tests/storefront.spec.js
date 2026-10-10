import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const products = [
  {
    id: 1,
    nombre: 'Soleil de Provence',
    marca: 'Maison Airbell',
    categoria: 'Unisex',
    descripcion: 'Bergamota y ámbar.',
    precio: 128000,
    precio_final: 128000,
    stock: 8,
    oferta: 0,
    tamano: '100 ml',
    sku: 'TEST-1',
    imagen: 'test.webp',
  },
  {
    id: 2,
    nombre: 'Fleur de Soie',
    marca: 'Atelier Nocturne',
    categoria: 'Femenino',
    descripcion: 'Notas florales.',
    precio: 112000,
    precio_final: 100800,
    stock: 4,
    oferta: 10,
    tamano: '50 ml',
    sku: 'TEST-2',
    imagen: 'test.webp',
  },
  {
    id: 3,
    nombre: 'Bois de Minuit',
    marca: 'Maison Airbell',
    categoria: 'Masculino',
    descripcion: 'Maderas suaves.',
    precio: 156000,
    precio_final: 156000,
    stock: 0,
    oferta: 0,
    tamano: '75 ml',
    sku: 'TEST-3',
    imagen: 'test.webp',
  },
];
async function fixtures(page, { authenticated = false, admin = false, broken = false } = {}) {
  let user = authenticated
    ? { id: 9, nombre: 'María', email: 'maria@example.test', rol: admin ? 'admin' : 'usuario' }
    : null;
  let cart = [];
  await page.route('**/uploads/test.webp', (route) =>
    route.fulfill({ path: 'public/images/editorial-hero.webp', contentType: 'image/webp' }),
  );
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let data = {},
      status = 200;
    if (url.pathname === '/api/auth/session') data = { user, csrfToken: 'test-token' };
    else if (url.pathname === '/api/products') {
      data = broken ? { message: 'No pudimos cargar la colección.' } : products;
      status = broken ? 503 : 200;
    } else if (url.pathname.startsWith('/api/products/'))
      data = products.find((p) => p.id === Number(url.pathname.split('/').pop()));
    else if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/register') {
      user = { id: 9, nombre: 'María', email: 'maria@example.test', rol: 'usuario' };
      data = { user, csrfToken: 'rotated-token' };
    } else if (url.pathname === '/api/auth/logout') {
      user = null;
      status = 204;
    } else if (url.pathname === '/api/cart' && request.method() === 'POST') {
      const payload = request.postDataJSON();
      const product = products.find((p) => p.id === payload.id_producto);
      cart = [{ ...product, cantidad: payload.cantidad }];
      data = cart;
    } else if (url.pathname === '/api/cart') data = cart;
    else if (url.pathname.startsWith('/api/cart/')) {
      const quantity = request.postDataJSON().cantidad;
      cart = quantity ? cart.map((p) => ({ ...p, cantidad: quantity })) : [];
      data = cart;
    } else if (url.pathname === '/api/admin/products') data = products;
    else if (url.pathname === '/api/payments/checkout') {
      data = { message: 'Los pagos todavía no están habilitados.' };
      status = 503;
    }
    if (status === 204) await route.fulfill({ status });
    else
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
}
test('catalog search, categories, brand, stock, sorting and empty results', async ({ page }) => {
  await fixtures(page);
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Para ella', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Fleur de Soie');
  await page.getByRole('button', { name: 'Todos los perfumes' }).click();
  await page.getByLabel('Buscar perfume o marca').fill('ámbar');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByLabel('Buscar perfume o marca').fill('inexistente');
  await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await page.getByLabel('Con stock').check();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByLabel('Ordenar').selectOption('low');
  await expect(page.locator('.product-card').first()).toContainText('Fleur de Soie');
  await page.getByLabel('Marca', { exact: true }).selectOption('Maison Airbell');
  await expect(page.locator('.product-card')).toHaveCount(1);
});
test('authenticated product selection, quantities, removal and payment failure', async ({
  page,
}) => {
  await fixtures(page, { authenticated: true });
  await page.goto('/producto/1');
  await page.getByRole('button', { name: 'Agregar a mi selección' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'se agregó' })).toBeVisible();
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.summary-total')).toContainText('128.000');
  await page.getByRole('button', { name: 'Aumentar cantidad de Soleil de Provence' }).click();
  await expect(page.locator('.summary-total')).toContainText('256.000');
  const request = page.waitForRequest('**/api/payments/checkout');
  await page.getByRole('button', { name: 'Continuar con Mercado Pago' }).click();
  expect((await request).postDataJSON()).toEqual({});
  await expect(page.getByRole('alert')).toContainText('todavía no están habilitados');
  await page.getByRole('button', { name: 'Quitar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'El comienzo de algo especial' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir carrito/ })).toBeFocused();
});
test('guest login redirect, registration validation and recovered account state', async ({
  page,
}) => {
  await fixtures(page);
  await page.goto('/producto/1');
  await page.getByRole('button', { name: 'Agregar a mi selección' }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Tu nombre', { exact: true }).fill('María');
  await page.getByLabel('Email', { exact: true }).fill('maria@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('una frase segura 2026');
  await page.getByLabel('Confirmá tu contraseña').fill('otra frase segura 2026');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  await page.getByLabel('Confirmá tu contraseña').fill('una frase segura 2026');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/producto\/1/);
  await page.reload();
  await expect(page.getByLabel('Mi cuenta')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('id'))).toBeNull();
});
test('forged browser role does not grant administration', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => {
    localStorage.setItem('id', '1');
    localStorage.setItem('rol', 'admin');
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('heading', { name: 'Cuidá cada detalle.' })).toHaveCount(0);
});
test('catalog request error is actionable and out-of-stock product cannot be added', async ({
  page,
}) => {
  await fixtures(page, { broken: true });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar');
  await expect(page.getByRole('button', { name: 'Volver a intentar' })).toBeVisible();
  await page.goto('/producto/3');
  await expect(page.getByRole('button', { name: 'Sin stock', exact: true })).toBeDisabled();
});
for (const width of [320, 375, 768, 1440]) {
  test('responsive and accessibility at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await fixtures(page);
    await page.goto('/');
    await expect(page.locator('.product-card')).toHaveCount(3);
    for (const path of ['/', '/login', '/producto/1']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations).toEqual([]);
    }
    await page.goto('/');
    if (width <= 768) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
      await page.getByRole('link', { name: 'Para él', exact: true }).click();
      await expect(page).toHaveURL(/categoria=Masculino/);
    }
    await page.getByRole('button', { name: /Abrir carrito/ }).click();
    const dialogAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(dialogAxe.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.goto('/');
    for (const image of await page.locator('.product-visual img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
        .toBe(true);
    }
    await page.screenshot({ path: 'test-results/home-' + width + '.png', fullPage: true });
  });
}
test('admin layout stays accessible on mobile and desktop', async ({ page }) => {
  await fixtures(page, { authenticated: true, admin: true });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Cuidá cada detalle.' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    await expect(page.getByLabel('Descripción', { exact: true })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});
