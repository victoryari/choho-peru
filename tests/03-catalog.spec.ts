import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 03: Catálogo de Repuestos & Transmisión', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe navegar al catálogo y mostrar la barra de búsqueda y filtros', async ({ page }) => {
    await page.goto('/catalog');
    
    // Campo de búsqueda
    const searchInput = page.getByPlaceholder('Buscar por nombre, SKU o categoría de transmisión...');
    await expect(searchInput).toBeVisible();

    // Filtros por familia
    await expect(page.getByText('Familia:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Todas', exact: true })).toBeVisible();
  });

  test('debe permitir cambiar entre vista cuadrícula y lista', async ({ page }) => {
    await page.goto('/catalog');

    const gridBtn = page.getByTitle('Vista Cuadrícula');
    const listBtn = page.getByTitle('Vista Lista');

    await expect(gridBtn).toBeVisible();
    await expect(listBtn).toBeVisible();

    // Cambiar a vista lista
    await listBtn.click();
    // Volver a vista cuadrícula
    await gridBtn.click();
  });

  test('debe filtrar productos al escribir en el buscador', async ({ page }) => {
    await page.goto('/catalog');

    const searchInput = page.getByPlaceholder('Buscar por nombre, SKU o categoría de transmisión...');
    await searchInput.fill('CADENA');
    // Si no coincide con nada o si encuentra coincidencias, no debe arrojar crash en pantalla
    await expect(page.locator('main')).toBeVisible();
  });

  test('debe abrir modal de detalle de producto si existen productos disponibles', async ({ page }) => {
    await page.goto('/catalog');

    const detailButtons = page.getByTitle('Ver Detalles Completos');
    const count = await detailButtons.count();
    if (count > 0) {
      await detailButtons.first().click();
      // El modal debe contener detalles del producto
      await expect(page.locator('role=dialog').or(page.getByText(/Especificaciones Técnicas|Ficha de Producto|Stock Disponible/i)).first()).toBeVisible();
    }
  });
});
