import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 08: Telemetría de Campo y Cuentas por Cobrar', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe navegar al panel de telemetría y geolocalización (/telemetry)', async ({ page }) => {
    await page.goto('/telemetry');

    // Título y contenedor
    await expect(page.getByText('Panel de Telemetría & Geolocalización de Rutas GPS')).toBeVisible();

    // Controles de vista y estado GPS
    await expect(page.getByRole('button', { name: /Activar Rastreo GPS Continuo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mapa Cartográfico Real/i })).toBeVisible();
  });

  test('debe navegar al módulo de cuentas por cobrar (/receivables)', async ({ page }) => {
    await page.goto('/receivables');

    // Título o descripción del módulo
    await expect(page.getByText(/Cuentas por Cobrar/i).first()).toBeVisible();

    // Buscador
    await expect(page.getByPlaceholder('Buscar por cliente, DNI/RUC o N° Comprobante...')).toBeVisible();

    // Botón de exportación
    await expect(page.getByRole('button', { name: /Exportar CSV/i }).first()).toBeVisible();
  });
});
