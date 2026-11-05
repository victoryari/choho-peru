import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 04: Control de Inventario y Almacén', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe mostrar la vista de inventario con botones principales de gestión', async ({ page }) => {
    await page.goto('/inventory');

    // Botones de acción principales
    await expect(page.getByRole('button', { name: /Importar \/ Actualizar con Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Registrar Nuevo Producto/i })).toBeVisible();
    
    // Campo de búsqueda
    await expect(page.getByPlaceholder('Buscar por SKU o nombre de producto...')).toBeVisible();
  });

  test('debe abrir y cerrar el modal para registrar nuevo producto', async ({ page }) => {
    await page.goto('/inventory');

    // Abrir modal de nuevo producto
    await page.getByRole('button', { name: /Registrar Nuevo Producto/i }).click();

    // Validar visibilidad del modal
    await expect(page.getByText('Registrar Nuevo Producto en Catálogo')).toBeVisible();
    await expect(page.getByPlaceholder('Ej. CAT-SPROCKET-005')).toBeVisible();

    // Cerrar modal
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(page.getByText('Registrar Nuevo Producto en Catálogo')).not.toBeVisible();
  });

  test('debe abrir y cerrar el modal de importación y actualización masiva por Excel', async ({ page }) => {
    await page.goto('/inventory');

    // Abrir modal de importación
    await page.getByRole('button', { name: /Importar \/ Actualizar con Excel/i }).click();

    // Validar contenido del modal de importación
    await expect(page.getByText('Importar Catálogo y Actualizar Stock Masivo')).toBeVisible();
    await expect(page.getByRole('button', { name: /Plantilla de Ejemplo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancelar/i })).toBeVisible();

    // Cerrar modal con botón Cancelar
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByText('Importar Catálogo y Actualizar Stock Masivo')).not.toBeVisible();
  });

  test('debe permitir buscar y filtrar productos en la tabla de inventario', async ({ page }) => {
    await page.goto('/inventory');

    const searchInput = page.getByPlaceholder('Buscar por SKU o nombre de producto...');
    await searchInput.fill('CHOHO');

    await expect(page.getByText(/Lista de Repuestos e Inventario Disponible/i)).toBeVisible();
  });
});
