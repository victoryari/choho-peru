import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 06: Caja Chica, Viáticos y Rendición SUNAT', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe mostrar las pestañas de Rendición de Caja Chica y Asignación de Viáticos', async ({ page }) => {
    await page.goto('/travel-budgets');

    const pettyTab = page.getByRole('button', { name: /Rendición de Caja Chica/i });
    const travelTab = page.getByRole('button', { name: /Asignación de Viáticos a Vendedores/i });

    await expect(pettyTab).toBeVisible();
    await expect(travelTab).toBeVisible();

    // Cambiar a pestaña Asignación de Viáticos
    await travelTab.click();
    await expect(page.getByRole('button', { name: /Nueva Asignación a Vendedor|Nueva Asignación/i }).first()).toBeVisible();

    // Regresar a Rendición de Caja Chica
    await pettyTab.click();
    await expect(page.getByRole('button', { name: /Rendir Comprobante de Caja Chica/i })).toBeVisible();
  });

  test('debe abrir modal de registro de gasto de caja chica con opción manual y XML', async ({ page }) => {
    await page.goto('/travel-budgets');

    // Clic en registrar comprobante
    await page.getByRole('button', { name: /Rendir Comprobante de Caja Chica/i }).click();

    // Debe mostrar selector de modo
    await expect(page.getByRole('button', { name: /Factura o Comprobante Físico/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Importar con Archivo XML Opcional/i })).toBeVisible();

    // Verificar campos manuales
    await expect(page.getByPlaceholder('20100070970')).toBeVisible();
    await expect(page.getByPlaceholder('F001', { exact: true })).toBeVisible();

    // Cerrar modal
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
  });

  test('debe cargar la vista de sustento de viáticos (/expenses)', async ({ page }) => {
    await page.goto('/expenses');

    await expect(page.getByText('Módulo de Sustento y Rendición de Viáticos SUNAT')).toBeVisible();
    await expect(page.getByPlaceholder('Ej. 20124567891')).toBeVisible();
    await expect(page.getByRole('button', { name: /Validar SUNAT/i })).toBeVisible();
  });
});
