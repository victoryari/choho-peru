import { test, expect } from '@playwright/test';

test.describe('Módulo 01: Autenticación y Control de Sesión', () => {

  test('debe mostrar la pantalla de inicio de sesión con branding institucional', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Portal Comercial B2B')).toBeVisible();
    await expect(page.getByLabel('Correo Electrónico Corporativo')).toBeVisible();
    await expect(page.getByLabel('Contraseña de Acceso')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('debe mostrar mensaje de error ante credenciales incorrectas', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo Electrónico Corporativo').fill('usuario_invalido@choho.pe');
    await page.getByLabel('Contraseña de Acceso').fill('password_incorrecto');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    // Debe mostrar banner o alerta de error
    await expect(page.getByText(/Credenciales incorrectas/i)).toBeVisible();
  });

  test('debe iniciar sesión exitosamente con credenciales de Administrador', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo Electrónico Corporativo').fill('admin@choho.pe');
    await page.getByLabel('Contraseña de Acceso').fill('123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    // Confirmar acceso al panel y que el avatar de perfil esté visible en el header
    const profileBtn = page.getByRole('button', { name: /perfil de usuario/i });
    await expect(profileBtn).toBeVisible({ timeout: 10000 });

    // Al abrir el modal de perfil, debe visualizarse el rol, nombre, correo y sede del usuario
    await profileBtn.click();
    await expect(page.getByText('Admin General')).toBeVisible();
    await expect(page.getByText('Administrador CHOHO')).toBeVisible();
    await expect(page.getByText('admin@choho.pe')).toBeVisible();
    await expect(page.getByText('Sede Asignada')).toBeVisible();
  });

  test('debe permitir cerrar sesión correctamente y volver al login', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo Electrónico Corporativo').fill('admin@choho.pe');
    await page.getByLabel('Contraseña de Acceso').fill('123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    const profileBtn = page.getByRole('button', { name: /perfil de usuario/i });
    await expect(profileBtn).toBeVisible({ timeout: 10000 });

    // Cerrar sesión
    await page.getByRole('button', { name: /Cerrar Sesión/i }).first().click();
    await expect(page.getByText('Portal Comercial B2B')).toBeVisible();
    await expect(page.getByLabel('Correo Electrónico Corporativo')).toBeVisible();
  });

  test('debe abrir el modal de perfil de usuario, mostrar su sede y pestaña de cambio de contraseña', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo Electrónico Corporativo').fill('admin@choho.pe');
    await page.getByLabel('Contraseña de Acceso').fill('123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    const profileBtn = page.getByRole('button', { name: /perfil de usuario/i });
    await expect(profileBtn).toBeVisible({ timeout: 10000 });

    // Abrir modal de perfil haciendo clic en el avatar del header
    await profileBtn.click();

    // Validar modal de perfil abierto
    await expect(page.getByText('Mi Perfil & Sede')).toBeVisible();
    await expect(page.getByText('Sede Asignada')).toBeVisible();
    await expect(page.getByText('Departamento / Área')).toBeVisible();

    // Cambiar a la pestaña de contraseña
    await page.getByRole('button', { name: /Cambiar Contraseña/i }).click();
    await expect(page.getByText('Contraseña Actual')).toBeVisible();
    await expect(page.getByText('Nueva Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Guardar Clave/i })).toBeVisible();

    // Cerrar modal
    await page.getByRole('button', { name: /Volver/i }).click();
    await expect(page.getByText('Mi Perfil & Sede')).toBeVisible();
  });
});
