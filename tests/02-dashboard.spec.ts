import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 02: Dashboard y Analítica Comercial', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe mostrar el cuadro de mando analítico con métricas principales', async ({ page }) => {
    await page.goto('/');
    
    // Título y descripción
    await expect(page.getByText('Dashboard Analítico')).toBeVisible();
    await expect(page.getByText(/Métricas y rendimiento de ventas/i)).toBeVisible();

    // Tarjetas KPI
    await expect(page.getByText('Ventas Facturadas')).toBeVisible();
    await expect(page.getByText('Cartera en Cotización')).toBeVisible();
    await expect(page.getByText('Comprobantes Emitidos')).toBeVisible();
    await expect(page.getByText('Ticket Medio de Venta')).toBeVisible();
  });

  test('debe mostrar los botones de exportación de reporte CSV y PDF', async ({ page }) => {
    await page.goto('/');
    
    const exportCsvBtn = page.getByRole('button', { name: /Exportar CSV/i });
    const exportPdfBtn = page.getByRole('button', { name: /PDF Resumen/i });

    await expect(exportCsvBtn).toBeVisible();
    await expect(exportPdfBtn).toBeVisible();
  });
});
