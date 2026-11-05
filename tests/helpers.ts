import { Page, expect } from '@playwright/test';

/**
 * Autentica al usuario Administrador en la plataforma CHOHO Perú.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  
  // Si ya está autenticado, no hacer nada
  const profileBtn = page.getByRole('button', { name: /perfil de usuario/i });
  if (await profileBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    return;
  }

  // Llenar formulario de acceso
  const emailInput = page.getByLabel('Correo Electrónico Corporativo');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill('admin@choho.pe');

  const passwordInput = page.getByLabel('Contraseña de Acceso');
  await passwordInput.fill('123');

  const submitButton = page.getByRole('button', { name: /Iniciar Sesión/i });
  await submitButton.click();

  // Esperar a que el panel principal cargue verificando el avatar de perfil en header
  await expect(profileBtn).toBeVisible({ timeout: 10000 });
}
