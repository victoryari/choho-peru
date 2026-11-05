import mysql from 'mysql2/promise';
import fs from 'fs';
import bcrypt from 'bcrypt';
import path from 'path';
import dotenv from 'dotenv';
import { SEED_ROLES, SEED_USERS, SEED_BRANCHES, SEED_DEPARTMENTS, SEED_CATEGORIAS, SEED_DISCOUNT_POLICIES } from './state.js';
import { runMigrations } from './migrate.js';

dotenv.config();

async function initDB() {
  const dbHost = process.env.DB_HOST || process.env.HOST || 'localhost';
  const dbUser = process.env.DB_USER || process.env.USERNAME || 'root';
  const dbPassword = process.env.DB_PASSWORD || process.env.PASSWORD || '';
  const dbName = process.env.DB_NAME || process.env.DATABASE || 'choho_peru';
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (process.env.PORT === '4000' ? 4000 : 3306);

  const isRemoteDb = Boolean(dbHost && dbHost !== 'localhost' && dbHost !== '127.0.0.1');

  console.log(`[MIGRATION ENGINE] Conectando a MySQL (${dbHost}:${dbPort})...`);
  
  // Create database if not exists
  const tempConn = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    port: dbPort,
    ssl: (process.env.DB_SSL === 'true' || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
  });
  await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await tempConn.end();

  const connection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: dbPort,
    ssl: (process.env.DB_SSL === 'true' || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true
  });

  try {
    console.log('[MIGRATION ENGINE] Creando/Actualizando estructura de tablas desde schema.sql...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
    await connection.query(schemaSql);

    console.log('[MIGRATION ENGINE] Aplicando migraciones idempotentes de esquema...');
    await runMigrations(connection as any);

    console.log('[MIGRATION ENGINE] Inicializando roles por defecto...');
    for (const r of SEED_ROLES) {
      await connection.query(
        `INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), permissions = VALUES(permissions)`,
        [r.id, r.name, r.description, JSON.stringify(r.permissions)]
      );
    }

    console.log('[MIGRATION ENGINE] Inicializando usuario administrador principal (admin@choho.pe)...');
    const adminPasswordHash = await bcrypt.hash('123', 10);
    await connection.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, branch, department, sales_zone) VALUES 
       ('USR-ADMIN', 'Administrador CHOHO', 'admin@choho.pe', ?, 'Admin General', 'ACTIVE', 'Sede Lima Centro', 'Gerencia', 'Zona - Lima')
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), status = VALUES(status)`,
      [adminPasswordHash]
    );

    console.log('[MIGRATION ENGINE] Inicializando sedes y departamentos...');
    for (const b of SEED_BRANCHES) {
      await connection.query(
        `INSERT INTO branches (id, name, status) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)`,
        [b.id, b.name, b.status]
      );
    }

    for (const d of SEED_DEPARTMENTS) {
      await connection.query(
        `INSERT INTO departments (id, name, status) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)`,
        [d.id, d.name, d.status]
      );
    }

    console.log('[MIGRATION ENGINE] Inicializando taxonomia de catalogo (Familia/Sub-familia/Linea)...');
    for (const c of SEED_CATEGORIAS) {
      await connection.query(
        `INSERT INTO categorias (id, nombre, parentId, nivel, activo) VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), parentId = VALUES(parentId), nivel = VALUES(nivel)`,
        [c.id, c.nombre, c.parentId, c.nivel]
      );
    }

    console.log('[MIGRATION ENGINE] Inicializando politicas oficiales de descuento...');
    for (const p of SEED_DISCOUNT_POLICIES) {
      await connection.query(
        `INSERT INTO discount_rules
           (id, scope, sku, productName, category, region, minQty, minAmount, maxAmount, discountType, discountCash, discountCredit, priceOfferCash, priceOfferCredit, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE scope = VALUES(scope), sku = VALUES(sku), productName = VALUES(productName),
           category = VALUES(category), region = VALUES(region), minQty = VALUES(minQty),
           minAmount = VALUES(minAmount), maxAmount = VALUES(maxAmount), discountType = VALUES(discountType),
           discountCash = VALUES(discountCash), discountCredit = VALUES(discountCredit),
           priceOfferCash = VALUES(priceOfferCash), priceOfferCredit = VALUES(priceOfferCredit),
           notes = VALUES(notes), status = VALUES(status)`,
        [p.id, p.scope, (p as any).sku ?? null, (p as any).productName ?? null, p.category, p.region ?? null, (p as any).minQty ?? null, p.minAmount ?? null, p.maxAmount ?? null, p.discountType, p.discountCash ?? null, p.discountCredit ?? null, (p as any).priceOfferCash ?? null, (p as any).priceOfferCredit ?? null, p.notes, p.status]
      );
    }

    console.log('✅ ¡Migración de base de datos MySQL (choho_peru) completada exitosamente!');
  } catch (error) {
    console.error('❌ Error al migrar la base de datos:', error);
  } finally {
    await connection.end();
  }
}

initDB();
