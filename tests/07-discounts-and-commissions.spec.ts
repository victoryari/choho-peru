import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 07: Reglas de Descuento y Comisiones', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe navegar a Reglas de Descuento (/discounts) y cambiar entre pestañas', async ({ page }) => {
    await page.goto('/discounts');

    // Comprobar pestañas
    await expect(page.getByRole('button', { name: /Reglas y Ofertas/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Políticas Oficiales/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simulador de Descuentos/i })).toBeVisible();

    // Cambiar a simulador
    await page.getByRole('button', { name: /Simulador de Descuentos/i }).click();
    await expect(page.getByText(/Simulador de Descuentos/i).first()).toBeVisible();
  });

  test('debe navegar al módulo de comisiones (/commissions) y verificar métricas y acciones', async ({ page }) => {
    await page.goto('/commissions');

    // Título principal
    await expect(page.getByText('Gestión y Cálculo de Comisiones')).toBeVisible();

    // Botones de acción
    await expect(page.getByRole('button', { name: /Editar Parámetros/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nueva Liquidación|Registrar Liquidación/i }).first()).toBeVisible();

    // Filtros de zona
    await expect(page.getByText(/Zona Lima|Zona:/i).first()).toBeVisible();
  });
});
