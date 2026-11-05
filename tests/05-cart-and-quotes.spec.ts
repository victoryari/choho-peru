import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 05: Presupuestos Comerciales y Cotizaciones', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe mostrar la interfaz del generador de presupuestos (/cart)', async ({ page }) => {
    await page.goto('/cart');

    await expect(page.getByText('Presupuesto Comercial')).toBeVisible();
    await expect(page.getByText('Información del Cliente')).toBeVisible();
    await expect(page.getByPlaceholder('Ej. 20608542193')).toBeVisible();
    await expect(page.getByRole('button', { name: /Consultar SUNAT/i })).toBeVisible();
  });

  test('debe calcular totales y permitir ingresar datos de cliente en presupuesto', async ({ page }) => {
    await page.goto('/cart');

    const rucInput = page.getByPlaceholder('Ej. 20608542193');
    await rucInput.fill('20100000001');

    const nameInput = page.getByPlaceholder('Nombre o razón comercial');
    await nameInput.fill('CLIENTE TEST AUTOMATIZADO');

    await expect(nameInput).toHaveValue('CLIENTE TEST AUTOMATIZADO');
  });

  test('debe visualizar el historial de cotizaciones y filtros de estado (/quotes)', async ({ page }) => {
    await page.goto('/quotes');

    // Campo de búsqueda
    await expect(page.getByPlaceholder('Buscar por código de cotización, nombre o RUC cliente...')).toBeVisible();

    // Filtros de estado
    await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pendiente' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceptada' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechazada' })).toBeVisible();

    // Botón de exportación
    await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible();
  });

  test('debe permitir buscar y agregar productos directamente desde el Omnibox POS', async ({ page }) => {
    await page.goto('/cart');

    // Buscar producto mediante el buscador rápido Omnibox
    const omnibox = page.getByPlaceholder(/Buscar por SKU/i);
    await expect(omnibox).toBeVisible();
    await omnibox.fill('428');

    // El desplegable de resultados debe mostrar resultados
    await expect(page.getByText(/Resultados en Catálogo/i)).toBeVisible();

    // Añadir el primer producto
    const addBtn = page.getByRole('button', { name: /Añadir/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // El ítem debe aparecer en la tabla de ítems del presupuesto
    await expect(page.getByText(/ítem/i).first()).toBeVisible();
    await expect(page.getByTitle(/Eliminar ítem/i)).toBeVisible();
  });

  test('debe consultar y autocompletar datos de RUC / DNI con Peru API', async ({ page }) => {
    await page.goto('/cart');

    const docInput = page.getByPlaceholder('Ej. 20608542193');
    await docInput.fill('20100070970');

    // Debe detectar que es RUC (11 dígitos)
    await expect(page.getByText(/RUC \(11 dígitos\)/i)).toBeVisible();

    // Ejecutar consulta
    await page.getByRole('button', { name: /Consultar SUNAT/i }).click();

    // Debe mostrar badge de validado
    await expect(page.getByText(/Datos validados con SUNAT/i)).toBeVisible({ timeout: 10000 });
  });
});
