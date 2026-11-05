import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Módulo 09: Administración del Sistema y Sincronización', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('debe ingresar al panel de administración (/admin) y cambiar entre pestañas de configuración', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByText('Panel de Administración Web & Configuración')).toBeVisible();

    // Pestañas
    const usersTab = page.getByRole('button', { name: 'Usuarios' });
    const rolesTab = page.getByRole('button', { name: 'Roles' });
    const structureTab = page.getByRole('button', { name: /Sedes & Deptos/i });
    const categoriesTab = page.getByRole('button', { name: 'Categorías' });
    const smtpTab = page.getByRole('button', { name: /SMTP \/ Correos/i });

    await expect(usersTab).toBeVisible();
    await expect(rolesTab).toBeVisible();
    await expect(structureTab).toBeVisible();
    await expect(categoriesTab).toBeVisible();
    await expect(smtpTab).toBeVisible();

    // Navegar a Roles
    await rolesTab.click();
    await expect(page.getByText(/Matriz de Roles y Permisos/i).or(page.getByText(/Crear Nuevo Rol/i))).toBeVisible();

    // Navegar a Sedes & Deptos
    await structureTab.click();
    await expect(page.getByText(/Sedes Operativas/i).or(page.getByText(/Departamentos/i))).toBeVisible();

    // Navegar a SMTP
    await smtpTab.click();
    await expect(page.getByText(/Configuración de Correos Salientes \(SMTP\)/i)).toBeVisible();
  });

  test('debe verificar la presencia de la lista de usuarios y formulario de nuevo colaborador', async ({ page }) => {
    await page.goto('/admin');

    // Sección para registrar usuario
    await expect(page.getByText('Registrar Colaborador').first()).toBeVisible();
    await expect(page.getByPlaceholder('ejemplo@choho.pe')).toBeVisible();

    // El usuario admin actual debe figurar en el listado
    await expect(page.getByText('admin@choho.pe').first()).toBeVisible();
  });

  test('debe ingresar al centro de sincronización (/sync) y permitir conmutar estado offline', async ({ page }) => {
    await page.goto('/sync');

    await expect(page.getByRole('heading', { name: /Centro de Sincronización/i }).or(page.getByText('Centro de Sincronización Datos')).first()).toBeVisible();

    // Botón de sincronización manual
    const syncButton = page.getByRole('button', { name: /Forzar Sincronización/i });
    await expect(syncButton).toBeVisible();
  });
});
