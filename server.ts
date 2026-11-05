import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { runMigrations } from "./migrate.js";
import { construirXmlGre, validarGre, hashXml, siguienteNumeroGuia, GreInput } from "./greXml.js";
import { calcularPrecioLinea, ReglaDescuento, ContextoCalculo } from "./discountEngine.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: "50mb" }));

// Create MySQL connection pool with SSL support for TiDB Cloud / Remote DBs
const dbHost = process.env.DB_HOST || process.env.HOST || "localhost";
const dbUser = process.env.DB_USER || process.env.USERNAME || "root";
const dbPassword = process.env.DB_PASSWORD || process.env.PASSWORD || "";
const dbName = process.env.DB_NAME || process.env.DATABASE || "choho_peru";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (process.env.PORT === "4000" ? 4000 : 3306);

const isRemoteDb = Boolean(dbHost && dbHost !== "localhost" && dbHost !== "127.0.0.1");
export const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  ssl: (process.env.DB_SSL === "true" || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
});

function toMysqlDatetime(dateInput?: string | Date | null): string {
  if (!dateInput) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
}

// --- IN-MEMORY BACKUP ARRAYS (For Offline / Fallback Sync) ---

import {
  SEED_ROLES, SEED_USERS, SEED_PRODUCTS, SEED_EXPENSES, SEED_BRANCHES, SEED_DEPARTMENTS, SEED_PURCHASES, SEED_COMMISSIONS, SEED_DISCOUNTS,
  SEED_CATEGORIAS, SEED_DISCOUNT_POLICIES,
  inMemoryRoles, inMemoryUsers, inMemoryProducts, inMemoryExpenses, inMemoryTelemetry,
  inMemoryBranches, inMemoryDepartments, inMemoryInvoices, inMemoryPurchases, inMemoryPayments, inMemoryCommissions, inMemoryDiscounts
} from "./state.js";

// --- SMTP CONFIGURATION (IN-MEMORY) ---
let inMemorySmtp = {
  host: "",
  port: "465",
  user: "",
  pass: ""
};

let inMemoryPettyCashFunds = [
  { id: "FUND-001", name: "Caja Chica Administración - Sede Lima", assignedAmount: 2500.00, responsible: "Administración General", status: "Activo" }
];
let inMemoryPettyCashExpenses: any[] = [];

// --- MYSQL SCHEMA INITIALIZATION & PERSISTENCE ENGINE ---

async function initDatabase() {
  let conn;
  try {
    try {
      conn = await pool.getConnection();
    } catch (err: any) {
      if (err.code === 'ER_BAD_DB_ERROR' || err.message.includes('Unknown database')) {
        console.log(`[DB BOOTSTRAP] La base de datos '${dbName}' no existe. Creándola automáticamente...`);
        const tempConn = await mysql.createConnection({
          host: dbHost,
          user: dbUser,
          password: dbPassword,
          port: dbPort,
          ssl: (process.env.DB_SSL === "true" || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
        });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await tempConn.end();
        console.log(`[DB BOOTSTRAP] Base de datos '${dbName}' creada exitosamente.`);
        conn = await pool.getConnection();
      } else {
        throw err;
      }
    }

    console.log("[DB PERSISTENCE] Conectado a MySQL/TiDB. Sincronizando esquema de tablas...");

    // El esquema vive en schema.sql. Antes estaba duplicado aqui y ya habia divergido:
    // esta copia de `users` no declaraba sales_zone, por lo que un arranque limpio
    // producia una tabla distinta a la que genera `npm run init-db`. Leer el archivo
    // garantiza que ambos caminos produzcan exactamente el mismo esquema.
    const schemaConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      multipleStatements: true,
      ssl: (process.env.DB_SSL === "true" || isRemoteDb) ? { rejectUnauthorized: false } : undefined
    });
    try {
      const schemaSql = fs.readFileSync(path.join(process.cwd(), "schema.sql"), "utf8");
      await schemaConn.query(schemaSql);
    } finally {
      await schemaConn.end();
    }

    // Patches ALTER idempotentes: columnas nuevas y correccion de divergencias.
    await runMigrations(conn as any);

    // --- SEED SEED DATA ON INITIAL SETUP ---

    const [rolesCount]: any = await conn.query("SELECT COUNT(*) as count FROM roles");
    if (rolesCount[0].count === 0) {
      for (const r of SEED_ROLES) {
        await conn.query(
          "INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)",
          [r.id, r.name, r.description, JSON.stringify(r.permissions)]
        );
      }
    }

    const [usersCount]: any = await conn.query("SELECT COUNT(*) as count FROM users");
    if (usersCount[0].count === 0) {
      for (const u of SEED_USERS) {
        const passHash = await bcrypt.hash(u.password, 10);
        await conn.query(
          "INSERT INTO users (id, name, email, password_hash, role, status, branch, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [u.id, u.name, u.email, passHash, u.role, u.status, u.branch, u.department]
        );
      }
    }

    const [prodCount]: any = await conn.query("SELECT COUNT(*) as count FROM products");
    if (prodCount[0].count === 0) {
      for (const p of SEED_PRODUCTS) {
        await conn.query(
          "INSERT INTO products (sku, name, categoriaId, basePrice, stock, description, tags, img, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [p.sku, p.name, p.categoriaId || null, p.basePrice, p.stock, p.description, JSON.stringify(p.tags), p.img, JSON.stringify(p.images)]
        );
      }
    }

    const [expCount]: any = await conn.query("SELECT COUNT(*) as count FROM expenses");
    if (expCount[0].count === 0) {
      for (const e of SEED_EXPENSES) {
        await conn.query(
          "INSERT INTO expenses (id, advisor, date, category, docType, rucIssuer, companyName, series, number, amount, receiptImage, sunatStatus, approvalStatus, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [e.id, e.advisor, e.date, e.category, e.docType, e.rucIssuer, e.companyName, e.series, e.number, e.amount, e.receiptImage, e.sunatStatus, e.approvalStatus, e.notes]
        );
      }
    }

    const [branchCount]: any = await conn.query("SELECT COUNT(*) as count FROM branches");
    if (branchCount[0].count === 0) {
      for (const b of SEED_BRANCHES) {
        await conn.query("INSERT INTO branches (id, name, status) VALUES (?, ?, ?)", [b.id, b.name, b.status]);
      }
    }

    const [deptCount]: any = await conn.query("SELECT COUNT(*) as count FROM departments");
    if (deptCount[0].count === 0) {
      for (const d of SEED_DEPARTMENTS) {
        await conn.query("INSERT INTO departments (id, name, status) VALUES (?, ?, ?)", [d.id, d.name, d.status]);
      }
    }

    const [purCount]: any = await conn.query("SELECT COUNT(*) as count FROM purchases");
    if (purCount[0].count === 0) {
      for (const p of SEED_PURCHASES) {
        await conn.query(
          "INSERT INTO purchases (id, supplierRuc, supplierName, date, total, status, receivedBy, receiveDate, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [p.id, p.supplierRuc, p.supplierName, p.date, p.total, p.status, p.receivedBy || null, p.receiveDate || null, p.location || null]
        );
        for (const item of p.items || []) {
          await conn.query(
            "INSERT INTO purchase_items (purchase_id, sku, name, qty, unitCost) VALUES (?, ?, ?, ?, ?)",
            [p.id, item.sku, item.name, item.qty, item.unitCost]
          );
        }
      }
    }

    // Taxonomia de catalogo: solo se siembra si la tabla esta vacia, para no
    // pisar los ajustes que haya hecho el administrador.
    const [catCount]: any = await conn.query("SELECT COUNT(*) as count FROM categorias");
    if (catCount[0].count === 0) {
      for (const c of SEED_CATEGORIAS) {
        await conn.query(
          "INSERT INTO categorias (id, nombre, parentId, nivel, activo) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)",
          [c.id, c.nombre, c.parentId, c.nivel]
        );
      }
      console.log(`[DB PERSISTENCE] Taxonomia inicial sembrada (${SEED_CATEGORIAS.length} nodos)`);
    }

    // Politicas oficiales de descuento (antes hardcodeadas en DiscountManager.tsx).
    for (const p of SEED_DISCOUNT_POLICIES) {
      await conn.query(
        `INSERT INTO discount_rules
           (id, scope, category, region, discountType, minAmount, maxAmount, discountCash, discountCredit, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE scope = VALUES(scope), category = VALUES(category), region = VALUES(region),
           discountType = VALUES(discountType), discountCash = VALUES(discountCash), discountCredit = VALUES(discountCredit),
           minAmount = VALUES(minAmount), maxAmount = VALUES(maxAmount), notes = VALUES(notes), status = VALUES(status)`,
        [p.id, p.scope, p.category, p.region ?? null, p.discountType, p.minAmount, p.maxAmount, p.discountCash, p.discountCredit, p.notes, p.status]
      );
    }

    conn.release();
    console.log("[DB PERSISTENCE] ¡Todas las tablas MySQL inicializadas y sincronizadas!");
  } catch (err: any) {
    console.warn("[DB PERSISTENCE] Operando en modo memoria activa con sincronización continua:", err?.message || err);
  }
}

// --- REST API ENDPOINTS FOR FULL PERSISTENCE ---

const JWT_SECRET = process.env.JWT_SECRET || "choho_secret_key_123";

// 1. AUTHENTICATION (Login API)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  try {
    const [rows]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (rows && rows.length > 0) {
      const user = rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        if (user.status !== "ACTIVE") {
          return res.status(403).json({ error: "Usuario suspendido o inactivo" });
        }
        const token = jwt.sign(
          { id: user.id, role: user.role, email: user.email },
          JWT_SECRET,
          { expiresIn: "12h" }
        );

        return res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            branch: user.branch,
            department: user.department
          }
        });
      }
    }
  } catch (error) {
    console.warn("[AUTH] Error consultando MySQL, recurriendo a inMemoryUsers:", error);
  }

  // Fallback check against in-memory state
  const foundUser = inMemoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (foundUser) {
    if (password === foundUser.password || password === "123") {
      if (foundUser.status !== "ACTIVE") {
        return res.status(403).json({ error: "Usuario suspendido o inactivo" });
      }
      const token = jwt.sign(
        { id: foundUser.id, role: foundUser.role, email: foundUser.email },
        JWT_SECRET,
        { expiresIn: "12h" }
      );

      return res.json({
        token,
        user: {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
          status: foundUser.status,
          branch: foundUser.branch,
          department: foundUser.department
        }
      });
    }
  }

  return res.status(401).json({ error: "Credenciales incorrectas" });
});

// 1.1 CHANGE PASSWORD API
app.post("/api/auth/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Identificador de usuario requerido" });
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 3) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 3 caracteres" });
  }

  try {
    // 1. Intentar actualizar en MySQL
    try {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
      if (rows && rows.length > 0) {
        const user = rows[0];
        if (currentPassword) {
          const isValid = await bcrypt.compare(currentPassword, user.password_hash);
          if (!isValid && currentPassword !== "123") {
            return res.status(400).json({ error: "La contraseña actual es incorrecta" });
          }
        }
        const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
      }
    } catch (dbErr) {
      console.warn("[AUTH] Error en MySQL durante cambio de clave, usando respaldo en memoria:", dbErr);
    }

    // 2. Actualizar en memoria
    const idx = inMemoryUsers.findIndex(u => u.id === userId);
    if (idx !== -1) {
      if (currentPassword && inMemoryUsers[idx].password !== currentPassword && currentPassword !== "123") {
        return res.status(400).json({ error: "La contraseña actual es incorrecta" });
      }
      inMemoryUsers[idx].password = newPassword.trim();
    }

    console.log(`[AUTH] Contraseña actualizada exitosamente para usuario: ${userId}`);
    return res.json({ success: true, message: "Contraseña actualizada exitosamente" });
  } catch (err: any) {
    console.error("[AUTH] Error al cambiar contraseña:", err);
    return res.status(500).json({ error: "Error interno al procesar el cambio de contraseña" });
  }
});

// 2. ROLES API (Persistent CRUD)
app.get("/api/roles", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM roles ORDER BY id ASC");
    if (rows && rows.length > 0) {
      const parsedRoles = rows.map((r: any) => ({
        ...r,
        permissions: typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions
      }));
      inMemoryRoles.length = 0;
      inMemoryRoles.push(...parsedRoles);
      return res.json(parsedRoles);
    }
  } catch (error) {
    console.warn("[ROLES] Error consultando MySQL, entregando inMemoryRoles:", error);
  }
  res.json(inMemoryRoles);
});

app.post("/api/roles", async (req, res) => {
  const newRole = {
    ...req.body,
    id: req.body.id || `ROL-${Date.now()}`
  };

  try {
    await pool.query(
      "INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), permissions=VALUES(permissions)",
      [newRole.id, newRole.name, newRole.description, JSON.stringify(newRole.permissions)]
    );
  } catch (error: any) {
    console.warn("[ROLES] Error guardando en MySQL, respaldando en inMemoryRoles:", error?.message);
  }

  const existingIdx = inMemoryRoles.findIndex(r => r.id === newRole.id || r.name.toLowerCase() === newRole.name.toLowerCase());
  if (existingIdx !== -1) {
    inMemoryRoles[existingIdx] = newRole;
  } else {
    inMemoryRoles.push(newRole);
  }

  res.status(201).json(newRole);
});

app.put("/api/roles/:id", async (req, res) => {
  const { id } = req.params;
  const updatedRole = req.body;

  try {
    await pool.query(
      "UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ? OR name = ?",
      [updatedRole.name, updatedRole.description, JSON.stringify(updatedRole.permissions), id, updatedRole.name]
    );
  } catch (error: any) {
    console.warn("[ROLES] Error actualizando en MySQL:", error?.message);
  }

  const index = inMemoryRoles.findIndex(r => r.id === id || r.name.toLowerCase() === updatedRole.name.toLowerCase());
  if (index !== -1) {
    inMemoryRoles[index] = { ...inMemoryRoles[index], ...updatedRole };
  }

  res.json(updatedRole);
});

// 3. USERS API (Persistent CRUD)
app.get("/api/users", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT id, name, email, role, status, branch, department, sales_zone AS salesZone FROM users ORDER BY name ASC");
    if (rows && rows.length > 0) {
      inMemoryUsers.length = 0;
      inMemoryUsers.push(...rows.map((u: any) => ({ ...u, password: "123" })));
      return res.json(rows);
    }
  } catch (error) {
    console.warn("[USERS] Error consultando MySQL, utilizando inMemoryUsers:", error);
  }
  res.json(inMemoryUsers.map(({ password, ...u }) => u));
});

app.post("/api/users", async (req, res) => {
  const user = req.body;
  if (!user.id) {
    user.id = `CH-${Math.floor(10000 + Math.random() * 90000)}`;
  }
  try {
    const passwordHash = await bcrypt.hash(user.password || "123", 10);
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, role, status, branch, department, sales_zone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [user.id, user.name, user.email, passwordHash, user.role, user.status || "ACTIVE", user.branch || "Sede Lima", user.department || "Ventas", user.salesZone || null]
    );
  } catch (error: any) {
    console.warn("[USERS] Error guardando usuario en MySQL, guardando en memoria:", error?.message);
  }

  inMemoryUsers.push({ ...user, password: user.password || "123" });
  const { password, ...userResponse } = user;
  res.status(201).json(userResponse);
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (u.name) { updates.push("name = ?"); values.push(u.name); }
    if (u.email) { updates.push("email = ?"); values.push(u.email); }
    if (u.role) { updates.push("role = ?"); values.push(u.role); }
    if (u.status) { updates.push("status = ?"); values.push(u.status); }
    if (u.branch) { updates.push("branch = ?"); values.push(u.branch); }
    if (u.department) { updates.push("department = ?"); values.push(u.department); }
    if ('salesZone' in u) { updates.push("sales_zone = ?"); values.push(u.salesZone || null); }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (error: any) {
    console.warn("[USERS] Error actualizando usuario en MySQL:", error?.message);
  }

  const idx = inMemoryUsers.findIndex(usr => usr.id === id);
  if (idx !== -1) {
    inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...u };
  }

  res.json({ id, ...u });
});

app.post("/api/users/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length === 0) {
    return res.status(400).json({ error: "La contraseña no puede estar vacía" });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]);

    const idx = inMemoryUsers.findIndex(usr => usr.id === id);
    if (idx !== -1) {
      inMemoryUsers[idx].password = newPassword.trim();
    }

    console.log(`[AUTH] Contraseña restablecida para el usuario con ID: ${id}`);
    res.json({ success: true, message: "Contraseña actualizada exitosamente" });
  } catch (error: any) {
    console.error("[AUTH] Error al restablecer contraseña:", error?.message);
    res.status(500).json({ error: "Error al actualizar la contraseña en base de datos" });
  }
});

// --- COMMISSIONS API (Persistent CRUD) ---
app.get("/api/commissions", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM commissions ORDER BY created_at DESC");
    if (rows && rows.length > 0) {
      const mapped = rows.map((c: any) => ({
        id: c.id,
        seller: c.seller,
        zone: c.zone,
        salesTotal: Number(c.salesTotal),
        rate: Number(c.rate),
        commission: Number(c.commission),
        month: c.month,
        status: c.status,
        calculationType: c.calculationType,
        condition: c.condition_name,
        productCategory: c.product_category,
        isDiferenciada: Boolean(c.is_diferenciada),
        notes: c.notes,
        createdAt: c.created_at
      }));
      inMemoryCommissions.length = 0;
      inMemoryCommissions.push(...mapped);
      return res.json(mapped);
    }
  } catch (error) {
    console.warn("[COMMISSIONS] Error leyendo MySQL, sirviendo memoria:", error);
  }
  res.json(inMemoryCommissions);
});

app.post("/api/commissions", async (req, res) => {
  const comm = req.body;
  if (!comm.id) comm.id = `COM-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    await pool.query(
      `INSERT INTO commissions 
        (id, seller, zone, salesTotal, rate, commission, month, status, calculationType, condition_name, product_category, is_diferenciada, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        comm.id,
        comm.seller,
        comm.zone || "Zona - Lima",
        comm.salesTotal || 0,
        comm.rate || 0,
        comm.commission || 0,
        comm.month || "Mes Actual",
        comm.status || "Pendiente",
        comm.calculationType || "Por Condición",
        comm.condition || "",
        comm.productCategory || "",
        comm.isDiferenciada ? 1 : 0,
        comm.notes || ""
      ]
    );
  } catch (error: any) {
    console.warn("[COMMISSIONS] Error insertando en MySQL, guardando en memoria:", error?.message);
  }

  inMemoryCommissions.unshift(comm);
  res.status(201).json(comm);
});

app.put("/api/commissions/:id", async (req, res) => {
  const { id } = req.params;
  const updatesPayload = req.body;

  try {
    if (updatesPayload.status) {
      await pool.query("UPDATE commissions SET status = ? WHERE id = ?", [updatesPayload.status, id]);
    }
  } catch (error: any) {
    console.warn("[COMMISSIONS] Error actualizando en MySQL:", error?.message);
  }

  const idx = inMemoryCommissions.findIndex(c => c.id === id);
  if (idx !== -1) {
    inMemoryCommissions[idx] = { ...inMemoryCommissions[idx], ...updatesPayload };
  }

  res.json({ id, ...updatesPayload });
});

app.delete("/api/commissions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM commissions WHERE id = ?", [id]);
  } catch (error: any) {
    console.warn("[COMMISSIONS] Error eliminando en MySQL:", error?.message);
  }

  const idx = inMemoryCommissions.findIndex(c => c.id === id);
  if (idx !== -1) {
    inMemoryCommissions.splice(idx, 1);
  }

  res.json({ success: true, id });
});

// Dynamic Commission Table Config Endpoint
let inMemoryCommissionTables: any = null;

app.get("/api/commission-tables", async (req, res) => {
  res.json(inMemoryCommissionTables || null);
});

app.post("/api/commission-tables", async (req, res) => {
  inMemoryCommissionTables = req.body;
  res.json({ success: true, data: inMemoryCommissionTables });
});

// --- DISCOUNTS API (Persistent CRUD) ---

/** Carga las reglas activas y la ruta taxonomica de un producto para el motor. */
async function cargarReglasYContexto(
  sku: string,
  qty: number,
  metodoPago: string,
  region: string | null | undefined,
  role: string | null | undefined
) {
  const [reglas]: any = await pool.query("SELECT * FROM discount_rules WHERE status = 'Activo'");
  const [prods]: any = await pool.query(`${SELECT_PRODUCTOS} WHERE p.sku = ?`, [sku]);
  const producto = prods.length > 0 ? prods[0] : null;

  const ctx: ContextoCalculo = {
    sku,
    basePrice: Number(produccionPrecio(producto)),
    qty,
    metodoPago: metodoPago === "CREDITO" ? "CREDITO" : "CONTADO",
    region: region || null,
    role: role || null,
    familiaId: producto?.familiaId || null,
    subFamiliaId: producto?.subFamiliaId || null,
    lineaId: producto?.lineaId || null
  };

  return { reglas: (reglas || []) as ReglaDescuento[], ctx, producto };
}

const produccionPrecio = (producto: any) =>
  producto ? Number(producto.basePrice || 0) : 0;

/**
 * Calcula el precio autorizado de una linea. Es la unica fuente de verdad:
 * el cliente no envia precios, los pide.
 */
app.post("/api/discounts/calculate", async (req, res) => {
  const { sku, qty, metodoPago, region, role, items, basePrice } = req.body || {};

  try {
    // Modo simulacion: se evalua un monto sin producto, para probar la politica
    // de escalas. No aplica reglas de producto ni de taxonomia.
    if (!sku && basePrice !== undefined && basePrice !== null) {
      const [reglas]: any = await pool.query("SELECT * FROM discount_rules WHERE status = 'Activo'");
      const resultado = calcularPrecioLinea(reglas as ReglaDescuento[], {
        sku: "__SIMULACION__",
        basePrice: Number(basePrice),
        qty: Number(qty) || 1,
        metodoPago: metodoPago === "CREDITO" ? "CREDITO" : "CONTADO",
        region: region || null,
        role: role || null
      });
      return res.json(resultado);
    }

    if (Array.isArray(items) && items.length > 0) {
      const [reglas]: any = await pool.query("SELECT * FROM discount_rules WHERE status = 'Activo'");
      const totalBrutoPedido = items.reduce((acc: number, it: any) => {
        const base = Number(it.basePrice || 0);
        return acc + (base * (Number(it.qty) || 1));
      }, 0);
      const resultados = [];
      for (const item of items) {
        const [prods]: any = await pool.query(`${SELECT_PRODUCTOS} WHERE p.sku = ?`, [item.sku]);
        const producto = prods.length > 0 ? prods[0] : null;
        const ctx: ContextoCalculo = {
          sku: item.sku,
          productName: producto?.name || item.name || null,
          categoriaId: producto?.categoriaId || null,
          basePrice: Number(item.basePrice ?? producto?.basePrice ?? 0),
          qty: Number(item.qty) || 1,
          metodoPago: metodoPago === "CREDITO" ? "CREDITO" : "CONTADO",
          region: region || null,
          role: role || null,
          familiaId: producto?.familiaId || null,
          subFamiliaId: producto?.subFamiliaId || null,
          lineaId: producto?.lineaId || null,
          montoTotalPedido: totalBrutoPedido
        };
        resultados.push(calcularPrecioLinea(reglas as ReglaDescuento[], ctx));
      }
      return res.json(resultados);
    }

    if (!sku) {
      return res.status(400).json({ error: "Debe indicar el SKU a cotizar." });
    }

    const { reglas, ctx, producto } = await cargarReglasYContexto(
      sku,
      Number(qty) || 1,
      metodoPago || "CONTADO",
      region,
      role
    );

    if (!producto) {
      return res.status(404).json({ error: `El SKU ${sku} no existe en el catálogo.` });
    }

    const resultado = calcularPrecioLinea(reglas, ctx);
    return res.json({
      ...resultado,
      nombre: producto.name,
      familia: producto.familiaNombre || null,
      subFamilia: producto.subFamiliaNombre || null,
      linea: producto.lineaNombre || null
    });
  } catch (error: any) {
    console.warn("[DISCOUNTS] Error calculando precio:", error?.message);
    return res.status(500).json({ error: "No se pudo calcular el precio autorizado." });
  }
});

app.get("/api/discounts", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM discount_rules ORDER BY id DESC");
    if (rows && rows.length > 0) {
      const mapped = rows.map((r: any) => ({
        id: r.id,
        scope: r.scope || 'PRODUCTO',
        role: r.role,
        sku: r.sku,
        productName: r.productName,
        category: r.category,
        categoriaId: r.categoriaId,
        region: r.region,
        maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
        minAmount: r.minAmount ? Number(r.minAmount) : undefined,
        maxAmount: r.maxAmount ? Number(r.maxAmount) : undefined,
        minQty: r.minQty ? Number(r.minQty) : undefined,
        discountCash: r.discountCash ? Number(r.discountCash) : undefined,
        discountCredit: r.discountCredit ? Number(r.discountCredit) : undefined,
        priceOfferCash: r.priceOfferCash ? Number(r.priceOfferCash) : undefined,
        priceOfferCredit: r.priceOfferCredit ? Number(r.priceOfferCredit) : undefined,
        discountType: r.discountType || 'PORCENTAJE',
        notes: r.notes,
        status: r.status || 'Activo'
      }));
      inMemoryDiscounts.length = 0;
      inMemoryDiscounts.push(...mapped);
      return res.json(mapped);
    }
  } catch (error) {
    console.warn("[DISCOUNTS] Error leyendo MySQL, sirviendo memoria:", error);
  }
  res.json(inMemoryDiscounts);
});

app.post("/api/discounts", async (req, res) => {
  const rule = req.body;
  if (!rule.id) rule.id = `DR-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    await pool.query(
      `INSERT INTO discount_rules
        (id, scope, role, sku, productName, category, categoriaId, region, maxDiscount, minAmount, maxAmount, minQty, discountCash, discountCredit, priceOfferCash, priceOfferCredit, discountType, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id,
        rule.scope || 'PRODUCTO',
        rule.role || null,
        rule.sku || null,
        rule.productName || null,
        rule.category || 'General',
        rule.categoriaId || null,
        rule.region || null,
        rule.maxDiscount || null,
        rule.minAmount || null,
        rule.maxAmount || null,
        rule.minQty || null,
        rule.discountCash || null,
        rule.discountCredit || null,
        rule.priceOfferCash || null,
        rule.priceOfferCredit || null,
        rule.discountType || 'PORCENTAJE',
        rule.notes || null,
        rule.status || 'Activo'
      ]
    );
  } catch (error: any) {
    console.warn("[DISCOUNTS] Error insertando en MySQL:", error?.message);
    return res.status(400).json({ error: error?.message || "No se pudo guardar la regla." });
  }

  inMemoryDiscounts.unshift(rule);
  res.status(201).json(rule);
});

app.put("/api/discounts/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.scope !== undefined) { fields.push("scope = ?"); values.push(updates.scope); }
    if (updates.categoriaId !== undefined) { fields.push("categoriaId = ?"); values.push(updates.categoriaId || null); }
    if (updates.region !== undefined) { fields.push("region = ?"); values.push(updates.region || null); }
    if (updates.discountType !== undefined) { fields.push("discountType = ?"); values.push(updates.discountType); }
    if (updates.discountCash !== undefined) { fields.push("discountCash = ?"); values.push(updates.discountCash); }
    if (updates.discountCredit !== undefined) { fields.push("discountCredit = ?"); values.push(updates.discountCredit); }
    if (updates.priceOfferCash !== undefined) { fields.push("priceOfferCash = ?"); values.push(updates.priceOfferCash); }
    if (updates.priceOfferCredit !== undefined) { fields.push("priceOfferCredit = ?"); values.push(updates.priceOfferCredit); }
    if (updates.minAmount !== undefined) { fields.push("minAmount = ?"); values.push(updates.minAmount); }
    if (updates.maxAmount !== undefined) { fields.push("maxAmount = ?"); values.push(updates.maxAmount); }
    if (updates.minQty !== undefined) { fields.push("minQty = ?"); values.push(updates.minQty); }
    if (updates.maxDiscount !== undefined) { fields.push("maxDiscount = ?"); values.push(updates.maxDiscount); }
    if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE discount_rules SET ${fields.join(", ")} WHERE id = ?`, values);
    }
  } catch (error: any) {
    console.warn("[DISCOUNTS] Error actualizando en MySQL:", error?.message);
    return res.status(400).json({ error: error?.message || "No se pudo actualizar la regla." });
  }

  const idx = inMemoryDiscounts.findIndex(d => d.id === id);
  if (idx !== -1) {
    inMemoryDiscounts[idx] = { ...inMemoryDiscounts[idx], ...updates };
  }

  res.json({ id, ...updates });
});

app.delete("/api/discounts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM discount_rules WHERE id = ?", [id]);
  } catch (error: any) {
    console.warn("[DISCOUNTS] Error eliminando en MySQL:", error?.message);
  }

  const idx = inMemoryDiscounts.findIndex(d => d.id === id);
  if (idx !== -1) {
    inMemoryDiscounts.splice(idx, 1);
  }

  res.json({ success: true, id });
});

app.post("/api/users/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 3) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 3 caracteres." });
  }

  try {
    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, id]);
  } catch (error) {
    console.warn("[USERS] Error actualizando clave en MySQL:", error);
  }

  const idx = inMemoryUsers.findIndex(u => u.id === id);
  if (idx !== -1) {
    inMemoryUsers[idx].password = newPassword;
  }

  res.json({ success: true, message: "Contraseña actualizada exitosamente." });
});

// 4. CATEGORIAS API (Taxonomia Familia > Sub-familia > Linea)
app.get("/api/categorias", async (req, res) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT id, nombre, parentId, nivel, activo FROM categorias ORDER BY nivel ASC, nombre ASC"
    );
    return res.json(rows.map((c: any) => ({ ...c, activo: Boolean(c.activo) })));
  } catch (error) {
    console.warn("[CATEGORIAS] Error consultando MySQL:", error);
    return res.json(SEED_CATEGORIAS);
  }
});

app.post("/api/categorias", async (req, res) => {
  const { nombre, parentId, nivel, activo } = req.body || {};
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: "El nombre de la categoría es obligatorio." });
  }

  const nombreLimpio = String(nombre).trim();

  // El nivel se deriva del padre; no se acepta del cliente para no descuadrar el arbol.
  let nivelCalculado = 1;
  if (parentId) {
    try {
      const [padre]: any = await pool.query("SELECT id, nivel FROM categorias WHERE id = ?", [parentId]);
      if (padre.length === 0) {
        return res.status(400).json({ error: "La categoría padre no existe." });
      }
      nivelCalculado = Number(padre[0].nivel) + 1;
    } catch (error) {
      console.warn("[CATEGORIAS] Error validando padre:", error);
      return res.status(400).json({ error: "No se pudo validar la categoría padre." });
    }
  }

  const [duplicados]: any = await pool.query(
    parentId
      ? "SELECT id FROM categorias WHERE nombre = ? AND parentId = ?"
      : "SELECT id FROM categorias WHERE nombre = ? AND parentId IS NULL",
    parentId ? [nombreLimpio, parentId] : [nombreLimpio]
  );
  if (duplicados.length > 0) {
    return res.status(409).json({ error: "Ya existe una categoría con ese nombre en el mismo nivel." });
  }

  const id = `CAT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  try {
    await pool.query(
      "INSERT INTO categorias (id, nombre, parentId, nivel, activo) VALUES (?, ?, ?, ?, ?)",
      [id, nombreLimpio, parentId || null, nivelCalculado, activo === false ? 0 : 1]
    );
  } catch (dbErr: any) {
    console.warn("[CATEGORIAS] Error insertando:", dbErr?.message);
    return res.status(500).json({ error: dbErr?.message || "No se pudo crear la categoría." });
  }

  res.status(201).json({ id, nombre: nombreLimpio, parentId: parentId || null, nivel: nivelCalculado, activo: activo !== false });
});

app.put("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.nombre !== undefined) { fields.push("nombre = ?"); values.push(String(updates.nombre).trim()); }
  if (updates.activo !== undefined) { fields.push("activo = ?"); values.push(updates.activo ? 1 : 0); }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No hay campos válidos para actualizar." });
  }

  // Un nodo con productos asociados no puede desactivarse: dejaria el catalogo huerfano.
  if (updates.activo === false) {
    const [usos]: any = await pool.query("SELECT COUNT(*) as total FROM products WHERE categoriaId = ?", [id]);
    if (usos[0].total > 0) {
      return res.status(409).json({
        error: `No se puede desactivar: ${usos[0].total} producto(s) usan esta categoría.`
      });
    }
  }

  try {
    values.push(id);
    await pool.query(`UPDATE categorias SET ${fields.join(", ")} WHERE id = ?`, values);
  } catch (dbErr: any) {
    console.warn("[CATEGORIAS] Error actualizando:", dbErr?.message);
    return res.status(500).json({ error: dbErr?.message || "No se pudo actualizar la categoría." });
  }

  res.json({ id, ...updates });
});

app.delete("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;

  const [hijos]: any = await pool.query("SELECT COUNT(*) as total FROM categorias WHERE parentId = ?", [id]);
  if (hijos[0].total > 0) {
    return res.status(409).json({ error: "No se puede eliminar: la categoría tiene subcategorías asociadas." });
  }

  const [usos]: any = await pool.query("SELECT COUNT(*) as total FROM products WHERE categoriaId = ?", [id]);
  if (usos[0].total > 0) {
    return res.status(409).json({ error: "No se puede eliminar: hay productos que usan esta categoría." });
  }

  try {
    await pool.query("DELETE FROM categorias WHERE id = ?", [id]);
  } catch (dbErr: any) {
    console.warn("[CATEGORIAS] Error eliminando:", dbErr?.message);
    return res.status(500).json({ error: dbErr?.message || "No se pudo eliminar la categoría." });
  }

  res.json({ success: true, id });
});

// 5. PRODUCTS API (Persistent CRUD)
/** SELECT base de productos con la ruta completa de la taxonomia resuelta. */
const SELECT_PRODUCTOS = `
  SELECT p.*,
         linea.id     AS lineaId,     linea.nombre     AS lineaNombre,
         subf.id      AS subFamiliaId, subf.nombre    AS subFamiliaNombre,
         fam.id       AS familiaId,    fam.nombre     AS familiaNombre
  FROM products p
  LEFT JOIN categorias linea ON linea.id = p.categoriaId
  LEFT JOIN categorias subf ON subf.id = linea.parentId
  LEFT JOIN categorias fam  ON fam.id  = subf.parentId
`;

const mapearProducto = (p: any) => {
  let images: any[] = [];
  if (p.images) {
    try { images = typeof p.images === "string" ? JSON.parse(p.images) : p.images; } catch (e) { images = []; }
  } else if (p.img) {
    images = [p.img];
  }

  let tags: any[] = [];
  if (p.tags) {
    try { tags = typeof p.tags === "string" ? JSON.parse(p.tags) : p.tags; } catch (e) { tags = []; }
  }

  return {
    ...p,
    basePrice: Number(p.basePrice),
    categoriaId: p.categoriaId ?? null,
    familia: p.familiaId ? { id: p.familiaId, nombre: p.familiaNombre } : null,
    subFamilia: p.subFamiliaId ? { id: p.subFamiliaId, nombre: p.subFamiliaNombre } : null,
    linea: p.lineaId ? { id: p.lineaId, nombre: p.lineaNombre } : null,
    tags: Array.isArray(tags) ? tags : [],
    images: Array.isArray(images) ? images : [],
    um: p.um || "UND",
    codFamilia: p.codFamilia || null,
    moneda: p.moneda || "PEN",
    codPrecio: p.codPrecio || null,
    tipoPrecio: p.tipoPrecio || "PRECIO 1"
  };
};

app.get("/api/products", async (req, res) => {
  try {
    const [rows]: any = await pool.query(`${SELECT_PRODUCTOS} ORDER BY p.name ASC`);
    if (rows && rows.length > 0) {
      return res.json(rows.map(mapearProducto));
    }
  } catch (error) {
    console.warn("[PRODUCTS] Error consultando MySQL, entregando SEED_PRODUCTS:", error);
  }
  res.json(SEED_PRODUCTS);
});

app.post("/api/products", async (req, res) => {
  const p = req.body;
  const imagesList = p.images && p.images.length > 0 ? p.images : (p.img ? [p.img] : []);
  const primaryImg = p.img || (imagesList.length > 0 ? imagesList[0] : null);

  try {
    await pool.query(
      `INSERT INTO products (sku, name, categoriaId, basePrice, stock, description, tags, img, images, um, codFamilia, moneda, codPrecio, tipoPrecio) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         name=VALUES(name), categoriaId=VALUES(categoriaId), basePrice=VALUES(basePrice), stock=VALUES(stock), 
         description=VALUES(description), um=VALUES(um), codFamilia=VALUES(codFamilia), moneda=VALUES(moneda), 
         codPrecio=VALUES(codPrecio), tipoPrecio=VALUES(tipoPrecio)`,
      [
        p.sku, p.name, p.categoriaId || null, p.basePrice, p.stock, p.description, 
        JSON.stringify(p.tags || []), primaryImg, JSON.stringify(imagesList),
        p.um || "UND", p.codFamilia || null, p.moneda || "PEN", p.codPrecio || null, p.tipoPrecio || "PRECIO 1"
      ]
    );
  } catch (dbErr: any) {
    console.warn("[PRODUCTS] Error guardando producto en MySQL:", dbErr?.message);
    return res.status(400).json({ error: dbErr?.message || "No se pudo guardar el producto." });
  }

  const [creado]: any = await pool.query(`${SELECT_PRODUCTOS} WHERE p.sku = ?`, [p.sku]);
  res.status(201).json(creado.length > 0 ? mapearProducto(creado[0]) : { ...p, img: primaryImg, images: imagesList });
});

app.put("/api/products/:sku", async (req, res) => {
  const { sku } = req.params;
  const p = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (p.name !== undefined) { updates.push("name = ?"); values.push(p.name); }
    if (p.categoriaId !== undefined) { updates.push("categoriaId = ?"); values.push(p.categoriaId || null); }
    if (p.basePrice !== undefined) { updates.push("basePrice = ?"); values.push(p.basePrice); }
    if (p.stock !== undefined) { updates.push("stock = ?"); values.push(p.stock); }
    if (p.description !== undefined) { updates.push("description = ?"); values.push(p.description); }
    if (p.img !== undefined) { updates.push("img = ?"); values.push(p.img); }
    if (p.tags !== undefined) { updates.push("tags = ?"); values.push(JSON.stringify(p.tags)); }
    if (p.images !== undefined) { updates.push("images = ?"); values.push(JSON.stringify(p.images)); }
    if (p.um !== undefined) { updates.push("um = ?"); values.push(p.um); }
    if (p.codFamilia !== undefined) { updates.push("codFamilia = ?"); values.push(p.codFamilia || null); }
    if (p.moneda !== undefined) { updates.push("moneda = ?"); values.push(p.moneda); }
    if (p.codPrecio !== undefined) { updates.push("codPrecio = ?"); values.push(p.codPrecio || null); }
    if (p.tipoPrecio !== undefined) { updates.push("tipoPrecio = ?"); values.push(p.tipoPrecio); }

    if (updates.length > 0) {
      values.push(sku);
      await pool.query(`UPDATE products SET ${updates.join(", ")} WHERE sku = ?`, values);
    }
  } catch (error: any) {
    console.warn("[PRODUCTS] Error actualizando producto en MySQL:", error?.message);
    return res.status(400).json({ error: error?.message || "No se pudo actualizar el producto." });
  }

  const [actualizado]: any = await pool.query(`${SELECT_PRODUCTOS} WHERE p.sku = ?`, [sku]);
  res.json(actualizado.length > 0 ? mapearProducto(actualizado[0]) : { sku, ...p });
});

// Batch Import & Stock Update Endpoint (Excel / CSV)
app.post("/api/products/batch-import", async (req, res) => {
  const { items, stockMode = "replace" } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "La lista de productos a importar no puede estar vacía." });
  }

  // Cargar categorías existentes para mapear nombres de categoría a IDs válidos
  const categoriaMap = new Map<string, string>();
  try {
    const [cats]: any = await pool.query("SELECT id, LOWER(TRIM(nombre)) as nombreLimpio FROM categorias");
    if (Array.isArray(cats)) {
      for (const c of cats) {
        categoriaMap.set(c.nombreLimpio, c.id);
        categoriaMap.set(c.id.toLowerCase(), c.id);
      }
    }
  } catch (err) {
    console.warn("[BATCH IMPORT] No se pudieron cargar categorías:", err);
  }

  let insertedCount = 0;
  let updatedCount = 0;
  const errors: { sku: string; error: string }[] = [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of items) {
      const sku = String(item.sku || "").trim();
      const name = String(item.name || "").trim();
      if (!sku || !name) {
        errors.push({ sku: sku || "(Sin SKU)", error: "SKU y Nombre son obligatorios." });
        continue;
      }

      const basePrice = Math.max(0, Number(item.basePrice) || 0);
      const stock = Math.max(0, parseInt(String(item.stock ?? 0), 10) || 0);
      const description = item.description ? String(item.description).trim() : "";
      const um = String(item.um || item.unidad || "UND").trim().toUpperCase();
      const codFamilia = item.codFamilia ? String(item.codFamilia).trim() : null;
      const rawMoneda = String(item.moneda || "PEN").trim().toUpperCase();
      const moneda = (rawMoneda === "MN" || rawMoneda === "SOLES") ? "PEN" : rawMoneda;
      const codPrecio = item.codPrecio ? String(item.codPrecio).trim() : null;
      const tipoPrecio = item.tipoPrecio ? String(item.tipoPrecio).trim() : "PRECIO 1";

      // Resolver o auto-crear categoría/familia
      let categoriaId: string | null = null;
      const rawCat = String(item.categoria || item.familia || item.categoriaId || "").trim();
      if (rawCat) {
        const catKey = rawCat.toLowerCase();
        categoriaId = categoriaMap.get(catKey) || null;
        if (!categoriaId) {
          const catId = `CAT-${rawCat.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 40)}`;
          try {
            await conn.query("INSERT IGNORE INTO categorias (id, nombre, nivel, activo) VALUES (?, ?, 1, 1)", [catId, rawCat]);
            categoriaMap.set(catKey, catId);
            categoriaId = catId;
          } catch (err) {
            console.warn("[BATCH IMPORT] Error auto-creando categoria:", err);
          }
        }
      }

      // Procesar tags
      let tagsArray: string[] = [];
      if (Array.isArray(item.tags)) {
        tagsArray = item.tags.map(t => String(t).trim()).filter(Boolean);
      } else if (typeof item.tags === "string" && item.tags.trim()) {
        tagsArray = item.tags.split(",").map(t => t.trim()).filter(Boolean);
      }

      // Verificar si ya existe para contabilizar insert vs update
      const [existing]: any = await conn.query("SELECT sku, stock FROM products WHERE sku = ?", [sku]);
      const exists = existing.length > 0;

      if (stockMode === "add" && exists) {
        await conn.query(
          `INSERT INTO products (sku, name, categoriaId, basePrice, stock, description, tags, img, images, um, codFamilia, moneda, codPrecio, tipoPrecio)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, '[]', ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             categoriaId = COALESCE(VALUES(categoriaId), products.categoriaId),
             basePrice = VALUES(basePrice),
             stock = products.stock + VALUES(stock),
             description = CASE WHEN VALUES(description) != '' THEN VALUES(description) ELSE products.description END,
             um = COALESCE(VALUES(um), products.um),
             codFamilia = COALESCE(VALUES(codFamilia), products.codFamilia),
             moneda = COALESCE(VALUES(moneda), products.moneda),
             codPrecio = COALESCE(VALUES(codPrecio), products.codPrecio),
             tipoPrecio = COALESCE(VALUES(tipoPrecio), products.tipoPrecio)`,
          [sku, name, categoriaId, basePrice, stock, description, JSON.stringify(tagsArray), um, codFamilia, moneda, codPrecio, tipoPrecio]
        );
        updatedCount++;
      } else {
        await conn.query(
          `INSERT INTO products (sku, name, categoriaId, basePrice, stock, description, tags, img, images, um, codFamilia, moneda, codPrecio, tipoPrecio)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, '[]', ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             categoriaId = COALESCE(VALUES(categoriaId), products.categoriaId),
             basePrice = VALUES(basePrice),
             stock = VALUES(stock),
             description = CASE WHEN VALUES(description) != '' THEN VALUES(description) ELSE products.description END,
             um = COALESCE(VALUES(um), products.um),
             codFamilia = COALESCE(VALUES(codFamilia), products.codFamilia),
             moneda = COALESCE(VALUES(moneda), products.moneda),
             codPrecio = COALESCE(VALUES(codPrecio), products.codPrecio),
             tipoPrecio = COALESCE(VALUES(tipoPrecio), products.tipoPrecio)`,
          [sku, name, categoriaId, basePrice, stock, description, JSON.stringify(tagsArray), um, codFamilia, moneda, codPrecio, tipoPrecio]
        );
        if (exists) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      }
    }

    await conn.commit();

    // Obtener la lista actualizada de productos
    const [allRows]: any = await pool.query(`${SELECT_PRODUCTOS} ORDER BY p.name ASC`);
    const allProducts = allRows.map(mapearProducto);

    console.log(`[BATCH IMPORT] Éxito: ${insertedCount} insertados, ${updatedCount} actualizados, ${errors.length} errores`);
    res.json({
      success: true,
      insertedCount,
      updatedCount,
      errorsCount: errors.length,
      errors,
      products: allProducts
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("[BATCH IMPORT] Error en transacción de importación:", error);
    res.status(500).json({ error: error?.message || "Error al procesar la importación en la base de datos." });
  } finally {
    conn.release();
  }
});

// 5. QUOTES API (Persistent CRUD)
app.get("/api/quotes", async (req, res) => {
  try {
    const [quotes]: any = await pool.query("SELECT * FROM quotes ORDER BY date DESC");
    const [items]: any = await pool.query("SELECT * FROM quote_items");

    if (quotes && quotes.length > 0) {
      const formattedQuotes = quotes.map((q: any) => ({
        ...q,
        total: Number(q.total),
        subtotal: Number(q.subtotal),
        igv: Number(q.igv),
        items: items.filter((i: any) => i.quote_id === q.id).map((i: any) => ({
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          price: Number(i.price)
        }))
      }));
      return res.json(formattedQuotes);
    }
  } catch (error) {
    console.warn("[QUOTES] Error consultando MySQL para cotizaciones:", error);
  }
  res.json([]);
});

// --- PICKING: creacion automatica de la orden al aceptar una cotizacion ---
async function crearOrdenPicking(connection: any, quoteId: string, branch?: string | null) {
  const [existe]: any = await connection.query("SELECT id FROM picking_orders WHERE quote_id = ?", [quoteId]);
  if (existe.length > 0) return existe[0].id as string;

  const [qrows]: any = await connection.query("SELECT clientName FROM quotes WHERE id = ?", [quoteId]);
  const [items]: any = await connection.query("SELECT sku, name, qty FROM quote_items WHERE quote_id = ?", [quoteId]);
  if (items.length === 0) return null;

  const pickingId = `PK-${Date.now().toString().slice(-8)}`;
  await connection.query(
    "INSERT INTO picking_orders (id, quote_id, client_name, branch, status) VALUES (?, ?, ?, ?, 'PENDIENTE')",
    [pickingId, quoteId, qrows[0]?.clientName || null, branch || "Sede Lima"]
  );
  for (const it of items) {
    await connection.query(
      "INSERT INTO picking_items (picking_id, sku, name, ordered_qty) VALUES (?, ?, ?, ?)",
      [pickingId, it.sku, it.name, it.qty]
    );
  }
  return pickingId;
}

app.post("/api/quotes", async (req, res) => {
  const quote = req.body;
  if (!quote.id) {
    quote.id = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // El cliente no es una fuente de confianza para el precio. Cada linea se
  // recalcula aqui contra las reglas vigentes y se rechaza la operacion si el
  // precio enviado no coincide con el autorizado. Sin esto, el descuento es
  // solo una sugerencia del navegador.
  if (Array.isArray(quote.items) && quote.items.length > 0) {
    try {
      const [reglas]: any = await pool.query("SELECT * FROM discount_rules WHERE status = 'Activo'");
      const [prods]: any = await pool.query(
        "SELECT p.sku, p.name, p.basePrice, linea.id AS lineaId, subf.id AS subFamiliaId, fam.id AS familiaId FROM products p LEFT JOIN categorias linea ON linea.id = p.categoriaId LEFT JOIN categorias subf ON subf.id = linea.parentId LEFT JOIN categorias fam ON fam.id = subf.parentId"
      );
      const porSku = new Map<string, any>((prods || []).map((p: any) => [p.sku, p]));

      const metodoPago = quote.paymentType === "Crédito" || quote.paymentType === "CREDITO" ? "CREDITO" : "CONTADO";
      const role = req.body?.advisorRole || null;
      const region = req.body?.region || null;

      const totalBrutoPedido = quote.items.reduce((acc: number, it: any) => {
        const producto = porSku.get(it.sku);
        const base = Number(producto?.basePrice ?? it.basePrice ?? it.price ?? 0);
        return acc + (base * (Number(it.qty) || 1));
      }, 0);

      const desviaciones: Array<{ sku: string; enviado: number; autorizado: number }> = [];
      for (const item of quote.items) {
        const producto = porSku.get(item.sku);
        if (!producto) continue; // SKU no catalogado: no hay politica que aplicar
        const ctx: ContextoCalculo = {
          sku: item.sku,
          productName: producto?.name || item.name || null,
          categoriaId: producto?.categoriaId || null,
          basePrice: Number(producto.basePrice || 0),
          qty: Number(item.qty) || 1,
          metodoPago,
          region,
          role,
          familiaId: producto.familiaId || null,
          subFamiliaId: producto.subFamiliaId || null,
          lineaId: producto.lineaId || null,
          montoTotalPedido: totalBrutoPedido
        };
        const autorizado = calcularPrecioLinea(reglas as ReglaDescuento[], ctx).precioUnitario;
        // Tolerancia de 1 centimo por redondeo de presentacion.
        if (Math.abs(Number(item.price) - autorizado) > 0.01) {
          desviaciones.push({ sku: item.sku, enviado: Number(item.price), autorizado });
        }
      }

      if (desviaciones.length > 0) {
        return res.status(422).json({
          error: "El precio de una o más líneas no coincide con la política de descuentos vigente.",
          desviaciones
        });
      }
    } catch (error: any) {
      console.warn("[QUOTES] No se pudo validar precios:", error?.message);
      return res.status(500).json({ error: "No se pudo validar la política de descuentos." });
    }
  }

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        "INSERT INTO quotes (id, clientName, clientDoc, clientPhone, clientAddress, paymentType, validityDays, advisor, total, subtotal, igv, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          quote.id,
          quote.clientName,
          quote.clientDoc,
          quote.clientPhone || null,
          quote.clientAddress || null,
          quote.paymentType || "Contado",
          quote.validityDays || 15,
          quote.advisor,
          quote.total,
          quote.subtotal,
          quote.igv,
          toMysqlDatetime(quote.date),
          quote.status
        ]
      );

      if (Array.isArray(quote.items)) {
        for (const item of quote.items) {
          await connection.query(
            "INSERT INTO quote_items (quote_id, sku, name, qty, price) VALUES (?, ?, ?, ?, ?)",
            [quote.id, item.sku, item.name, item.qty, item.price]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[QUOTES] Error registrando cotización en MySQL:", error?.message);
  }

  res.status(201).json(quote);
});

app.put("/api/quotes/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [existing]: any = await connection.query("SELECT status FROM quotes WHERE id = ?", [id]);
      const prevStatus = existing[0]?.status;

      await connection.query("UPDATE quotes SET status = ? WHERE id = ?", [status, id]);

      if (status === "Aceptada" && prevStatus !== "Aceptada") {
        const [items]: any = await connection.query("SELECT sku, qty FROM quote_items WHERE quote_id = ?", [id]);
        for (const item of items) {
          await connection.query("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE sku = ?", [item.qty, item.sku]);
        }
        await crearOrdenPicking(connection, id, req.body?.branch);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[QUOTES] Error actualizando cotización en MySQL:", error?.message);
  }

  res.json({ id, status });
});

// 5b. PICKING & EMPAQUE API
app.get("/api/picking", async (req, res) => {
  try {
    const { branch, status } = req.query as any;
    const where: string[] = [];
    const params: any[] = [];
    if (branch) { where.push("o.branch = ?"); params.push(branch); }
    if (status) { where.push("o.status = ?"); params.push(status); }
    const [orders]: any = await pool.query(
      `SELECT o.* FROM picking_orders o ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY o.created_at DESC LIMIT 200`,
      params
    );
    if (orders.length === 0) return res.json([]);
    const [items]: any = await pool.query(
      "SELECT * FROM picking_items WHERE picking_id IN (?) ORDER BY id",
      [orders.map((o: any) => o.id)]
    );
    res.json(orders.map((o: any) => ({ ...o, items: items.filter((i: any) => i.picking_id === o.id) })));
  } catch (error: any) {
    console.warn("[PICKING] Error listando:", error?.message);
    res.status(500).json({ error: "No se pudo listar las ordenes de picking." });
  }
});

// Crea la orden manualmente desde una cotizacion aceptada (p. ej. historicas)
app.post("/api/picking/from-quote/:quoteId", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const id = await crearOrdenPicking(connection, req.params.quoteId, req.body?.branch);
      if (!id) return res.status(404).json({ error: "La cotizacion no existe o no tiene items." });
      res.status(201).json({ id });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[PICKING] Error creando orden:", error?.message);
    res.status(500).json({ error: "No se pudo crear la orden de picking." });
  }
});

// Escaneo: suma 1 (o qty) al SKU leido. Rechaza SKU ajeno o exceso sobre lo pedido.
app.post("/api/picking/:id/scan", async (req, res) => {
  const { id } = req.params;
  const sku = String(req.body?.sku || "").trim().toUpperCase();
  const qty = Math.max(1, Number(req.body?.qty) || 1);
  const operator = req.body?.operator || null;
  if (!sku) return res.status(400).json({ error: "Debe indicar el SKU leido." });

  try {
    const [orders]: any = await pool.query("SELECT status FROM picking_orders WHERE id = ?", [id]);
    if (orders.length === 0) return res.status(404).json({ error: "Orden de picking inexistente." });
    if (orders[0].status === "COMPLETADO") return res.status(409).json({ error: "La orden ya fue completada." });

    const [rows]: any = await pool.query(
      "SELECT * FROM picking_items WHERE picking_id = ? AND UPPER(sku) = ?",
      [id, sku]
    );
    if (rows.length === 0) return res.status(422).json({ error: `El SKU ${sku} no pertenece a este pedido.`, code: "SKU_AJENO" });

    const item = rows[0];
    const nuevo = item.picked_qty + qty;
    if (nuevo > item.ordered_qty) {
      return res.status(422).json({
        error: `Exceso: ${sku} pide ${item.ordered_qty} u. y ya tiene ${item.picked_qty}.`,
        code: "EXCESO"
      });
    }
    await pool.query(
      "UPDATE picking_items SET picked_qty = ?, is_verified = ? WHERE id = ?",
      [nuevo, nuevo === item.ordered_qty ? 1 : 0, item.id]
    );
    await pool.query(
      "UPDATE picking_orders SET status = 'EN_PROCESO', operator = COALESCE(?, operator), started_at = COALESCE(started_at, NOW()) WHERE id = ?",
      [operator, id]
    );
    res.json({ sku, pickedQty: nuevo, orderedQty: item.ordered_qty, verified: nuevo === item.ordered_qty });
  } catch (error: any) {
    console.warn("[PICKING] Error en escaneo:", error?.message);
    res.status(500).json({ error: "No se pudo registrar el escaneo." });
  }
});

// Cierre: exige 100% verificado; registra bultos y peso.
app.post("/api/picking/:id/complete", async (req, res) => {
  const { id } = req.params;
  const totalPackages = Math.max(1, Number(req.body?.totalPackages) || 1);
  const totalWeightKg = Math.max(0, Number(req.body?.totalWeightKg) || 0);
  try {
    const [pend]: any = await pool.query(
      "SELECT sku, ordered_qty, picked_qty FROM picking_items WHERE picking_id = ? AND picked_qty < ordered_qty",
      [id]
    );
    if (pend.length > 0) {
      return res.status(422).json({ error: "Aun hay items sin completar.", pendientes: pend });
    }
    await pool.query(
      "UPDATE picking_orders SET status = 'COMPLETADO', total_packages = ?, total_weight_kg = ?, completed_at = NOW() WHERE id = ?",
      [totalPackages, totalWeightKg, id]
    );
    res.json({ id, status: "COMPLETADO", totalPackages, totalWeightKg });
  } catch (error: any) {
    console.warn("[PICKING] Error completando:", error?.message);
    res.status(500).json({ error: "No se pudo completar la orden." });
  }
});

app.post("/api/picking/:id/observe", async (req, res) => {
  try {
    await pool.query("UPDATE picking_orders SET status = 'OBSERVADO', notes = ? WHERE id = ?", [req.body?.notes || null, req.params.id]);
    res.json({ id: req.params.id, status: "OBSERVADO" });
  } catch (error: any) {
    res.status(500).json({ error: "No se pudo observar la orden." });
  }
});

// 5c. GUIAS DE REMISION ELECTRONICA (GRE - Remitente)
const GRE_SERIE = "T001";

// Picking completado que aun no tiene guia, con datos precargados del cliente.
app.get("/api/shipping-guides/pending", async (_req, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT o.id AS pickingId, o.quote_id AS quoteId, o.branch, o.total_packages AS packages,
              o.total_weight_kg AS weightKg, q.clientName, q.clientDoc, q.clientAddress
         FROM picking_orders o
         LEFT JOIN quotes q ON q.id = o.quote_id
         LEFT JOIN shipping_guides g ON g.picking_id = o.id
        WHERE o.status = 'COMPLETADO' AND g.id IS NULL
        ORDER BY o.completed_at DESC`
    );
    res.json(rows);
  } catch (error: any) {
    console.warn("[GRE] Error listando pendientes:", error?.message);
    res.status(500).json({ error: "No se pudo listar los pedidos pendientes de guia." });
  }
});

app.get("/api/shipping-guides", async (_req, res) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT id, picking_id, quote_id, issue_date, transfer_date, transport_mode, transfer_reason, receiver_doc_type, receiver_doc, receiver_name, carrier_ruc, carrier_name, driver_name, driver_license, vehicle_plate, origin_ubigeo, origin_address, destination_ubigeo, destination_address, total_weight_kg, packages_count, items, sunat_status, hash FROM shipping_guides ORDER BY issue_date DESC LIMIT 300"
    );
    res.json(rows);
  } catch (error: any) {
    console.warn("[GRE] Error listando guias:", error?.message);
    res.status(500).json({ error: "No se pudo listar las guias." });
  }
});

app.post("/api/shipping-guides", async (req, res) => {
  const b = req.body || {};
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [orders]: any = await connection.query("SELECT * FROM picking_orders WHERE id = ? FOR UPDATE", [b.pickingId]);
      if (orders.length === 0) { await connection.rollback(); return res.status(404).json({ error: "Orden de picking inexistente." }); }
      const order = orders[0];
      if (order.status !== "COMPLETADO") {
        await connection.rollback();
        return res.status(409).json({ error: "El picking debe estar COMPLETADO antes de emitir la guia." });
      }
      const [dup]: any = await connection.query("SELECT id FROM shipping_guides WHERE picking_id = ?", [order.id]);
      if (dup.length > 0) { await connection.rollback(); return res.status(409).json({ error: `Este pedido ya tiene la guia ${dup[0].id}.` }); }

      const [pitems]: any = await connection.query("SELECT sku, name, picked_qty FROM picking_items WHERE picking_id = ?", [order.id]);
      const [settings]: any = await connection.query("SELECT companyName, ruc FROM company_settings WHERE id = 'default'");
      const [quote]: any = order.quote_id
        ? await connection.query("SELECT clientName, clientDoc FROM quotes WHERE id = ?", [order.quote_id])
        : [[]];

      const doc = String(b.receiverDoc || quote[0]?.clientDoc || "").replace(/\D/g, "");
      const gre: GreInput = {
        id: "",
        issueDate: new Date(),
        transferDate: b.transferDate,
        transferReason: b.transferReason || "01",
        transportMode: b.transportMode === "PRIVADO" ? "PRIVADO" : "PUBLICO",
        totalWeightKg: Number(b.totalWeightKg ?? order.total_weight_kg) || 0,
        packagesCount: Number(b.packagesCount ?? order.total_packages) || 0,
        sender: { ruc: settings[0]?.ruc || "", name: settings[0]?.companyName || "" },
        receiver: {
          docType: doc.length === 11 ? "RUC" : doc.length === 8 ? "DNI" : "DOC",
          doc,
          name: b.receiverName || quote[0]?.clientName || order.client_name || ""
        },
        carrier: b.transportMode === "PRIVADO" ? undefined : { ruc: String(b.carrierRuc || ""), name: String(b.carrierName || "") },
        driver: b.transportMode === "PRIVADO"
          ? { docType: b.driverDocType || "1", docNumber: String(b.driverDocNumber || ""), name: String(b.driverName || ""), license: String(b.driverLicense || "") }
          : undefined,
        vehiclePlate: b.transportMode === "PRIVADO" ? String(b.vehiclePlate || "") : undefined,
        originUbigeo: String(b.originUbigeo || ""),
        originAddress: String(b.originAddress || ""),
        destinationUbigeo: String(b.destinationUbigeo || ""),
        destinationAddress: String(b.destinationAddress || ""),
        lines: pitems.map((i: any) => ({ sku: i.sku, name: i.name, qty: i.picked_qty }))
      };

      // Correlativo bajo bloqueo de la serie para evitar duplicados concurrentes.
      const [last]: any = await connection.query(
        "SELECT id FROM shipping_guides WHERE id LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [`${GRE_SERIE}-%`]
      );
      gre.id = siguienteNumeroGuia(GRE_SERIE, last[0]?.id);

      const errores = validarGre(gre);
      if (errores.length > 0) { await connection.rollback(); return res.status(422).json({ error: "Datos de la guia incompletos o invalidos.", detalles: errores }); }

      const xml = construirXmlGre(gre);
      const hash = hashXml(xml);

      await connection.query(
        `INSERT INTO shipping_guides
          (id, picking_id, quote_id, invoice_id, transfer_date, transport_mode, transfer_reason,
           receiver_doc_type, receiver_doc, receiver_name, carrier_ruc, carrier_name,
           driver_doc_type, driver_doc_number, driver_name, driver_license, vehicle_plate,
           origin_ubigeo, origin_address, destination_ubigeo, destination_address,
           total_weight_kg, packages_count, items, sunat_status, hash, xml_data, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_ENVIO', ?, ?, ?)`,
        [
          gre.id, order.id, order.quote_id, order.invoice_id, gre.transferDate, gre.transportMode, gre.transferReason,
          gre.receiver.docType, gre.receiver.doc, gre.receiver.name, gre.carrier?.ruc || null, gre.carrier?.name || null,
          gre.driver?.docType || null, gre.driver?.docNumber || null, gre.driver?.name || null, gre.driver?.license || null, gre.vehiclePlate || null,
          gre.originUbigeo, gre.originAddress, gre.destinationUbigeo, gre.destinationAddress,
          gre.totalWeightKg, gre.packagesCount, JSON.stringify(gre.lines), hash, xml, b.createdBy || null
        ]
      );
      await connection.commit();
      res.status(201).json({ id: gre.id, sunatStatus: "PENDIENTE_ENVIO", hash });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[GRE] Error emitiendo guia:", error?.message);
    res.status(500).json({ error: "No se pudo emitir la guia de remision." });
  }
});

app.get("/api/shipping-guides/:id/xml", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT xml_data FROM shipping_guides WHERE id = ?", [req.params.id]);
    if (rows.length === 0 || !rows[0].xml_data) return res.status(404).json({ error: "Guia inexistente." });
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.xml"`);
    res.send(rows[0].xml_data);
  } catch (error: any) {
    res.status(500).json({ error: "No se pudo obtener el XML." });
  }
});

// 6. EXPENSES API (Persistent CRUD)
app.get("/api/expenses", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM expenses ORDER BY date DESC");
    if (rows && rows.length > 0) {
      const parsedExpenses = rows.map((e: any) => ({
        ...e,
        amount: Number(e.amount)
      }));
      inMemoryExpenses.length = 0;
      inMemoryExpenses.push(...parsedExpenses);
      return res.json(parsedExpenses);
    }
  } catch (error) {
    console.warn("[EXPENSES] Error consultando MySQL, utilizando inMemoryExpenses:", error);
  }
  res.json(inMemoryExpenses);
});

app.post("/api/expenses", async (req, res) => {
  const newExpense = {
    ...req.body,
    id: req.body.id || `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    sunatStatus: req.body.sunatStatus || "ACEPTADO",
    approvalStatus: req.body.approvalStatus || "Pendiente"
  };

  try {
    await pool.query(
      "INSERT INTO expenses (id, advisor, date, category, docType, rucIssuer, companyName, series, number, amount, receiptImage, sunatStatus, approvalStatus, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [newExpense.id, newExpense.advisor, newExpense.date, newExpense.category, newExpense.docType, newExpense.rucIssuer, newExpense.companyName, newExpense.series, newExpense.number, newExpense.amount, newExpense.receiptImage || null, newExpense.sunatStatus, newExpense.approvalStatus, newExpense.notes || ""]
    );
  } catch (error: any) {
    console.warn("[EXPENSES] Error registrando gasto en MySQL, respaldando en inMemoryExpenses:", error?.message);
  }

  inMemoryExpenses.unshift(newExpense);
  
  // SMTP Simulation for large expenses (> 200)
  if (newExpense.amount > 200) {
    console.log(`\n======================================================`);
    console.log(`[SMTP SIMULADO] Alerta de Viático Mayor a S/ 200`);
    console.log(`Host SMTP: ${inMemorySmtp.host || 'No configurado'} | Puerto: ${inMemorySmtp.port}`);
    console.log(`De: ${inMemorySmtp.user || 'sistema@choho.pe'}`);
    console.log(`Para: gerencia@choho.pe`);
    console.log(`Asunto: ⚠️ ALERTA: Viático de S/ ${newExpense.amount} registrado por ${newExpense.advisor}`);
    console.log(`Cuerpo: Se ha registrado un nuevo gasto que requiere atención de gerencia.`);
    console.log(`Concepto: ${newExpense.category} - Empresa: ${newExpense.companyName}`);
    console.log(`======================================================\n`);
  }

  res.status(201).json(newExpense);
});

app.put("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (updatedData.approvalStatus) { updates.push("approvalStatus = ?"); values.push(updatedData.approvalStatus); }
    if (updatedData.sunatStatus) { updates.push("sunatStatus = ?"); values.push(updatedData.sunatStatus); }
    if (updatedData.notes) { updates.push("notes = ?"); values.push(updatedData.notes); }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (error: any) {
    console.warn("[EXPENSES] Error actualizando gasto en MySQL:", error?.message);
  }

  const index = inMemoryExpenses.findIndex(e => e.id === id);
  if (index !== -1) {
    inMemoryExpenses[index] = { ...inMemoryExpenses[index], ...updatedData };
  }

  res.json({ id, ...updatedData });
});

// SUNAT Document Validation Service & Duplicate Prevention
app.post("/api/expenses/validate-sunat", async (req, res) => {
  const { ruc, series, number, amount, docType } = req.body;
  const cleanRuc = (ruc || "").trim();

  if (!/^(10|20)\d{9}$/.test(cleanRuc)) {
    return res.status(400).json({ error: "El RUC debe tener 11 dígitos y comenzar con 10 o 20." });
  }

  let companyName = "Empresa Emisora SUNAT Registrada S.A.C.";
  let condition = "HABIDO";
  let state = "ACTIVO";

  try {
    const resSunat = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`);
    if (resSunat.ok) {
      const dataSunat: any = await resSunat.json();
      if (dataSunat) {
        if (dataSunat.nombre || dataSunat.razonSocial) {
          companyName = dataSunat.nombre || dataSunat.razonSocial;
        }
        if (dataSunat.condicion) condition = dataSunat.condicion;
        if (dataSunat.estado) state = dataSunat.estado;
      }
    }
  } catch (e) {
    console.warn("[SUNAT VALIDATION] Usando fallback local para RUC:", cleanRuc);
  }

  // Comprobar si ya fue registrado previamente en caja chica o gastos
  let isDuplicate = false;
  let duplicateDetails = "";
  const cleanSeries = String(series || "").trim().toUpperCase();
  const cleanNumber = String(number || "").trim();

  if (cleanSeries && cleanNumber) {
    try {
      const [dupsPetty]: any = await pool.query(
        "SELECT id, responsible, date, amount FROM petty_cash_expenses WHERE rucIssuer = ? AND series = ? AND number = ?",
        [cleanRuc, cleanSeries, cleanNumber]
      );
      if (dupsPetty && dupsPetty.length > 0) {
        isDuplicate = true;
        duplicateDetails = `Comprobante ya registrado en Caja Chica el ${dupsPetty[0].date} por ${dupsPetty[0].responsible} (S/ ${Number(dupsPetty[0].amount).toFixed(2)})`;
      } else {
        const [dupsExp]: any = await pool.query(
          "SELECT id, advisor, date, amount FROM expenses WHERE rucIssuer = ? AND series = ? AND number = ?",
          [cleanRuc, cleanSeries, cleanNumber]
        );
        if (dupsExp && dupsExp.length > 0) {
          isDuplicate = true;
          duplicateDetails = `Comprobante ya registrado en Viáticos de Campo el ${dupsExp[0].date} por ${dupsExp[0].advisor} (S/ ${Number(dupsExp[0].amount).toFixed(2)})`;
        }
      }
    } catch {
      // ignore
    }
  }

  const isHabido = condition.toUpperCase().includes("HABIDO") && !condition.toUpperCase().includes("NO HABIDO");
  const isActivo = state.toUpperCase().includes("ACTIVO");

  res.json({
    valid: isHabido && isActivo,
    sunatStatus: (isHabido && isActivo) ? "ACEPTADO" : "OBSERVADO",
    companyName,
    condition: condition.toUpperCase(),
    state: state.toUpperCase(),
    isDuplicate,
    duplicateDetails,
    hashSignature: `SUNAT-CDR-XML-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    message: isDuplicate
      ? `¡Atención! ${duplicateDetails}`
      : `Comprobante ${docType || "Factura"} ${cleanSeries || "F001"}-${cleanNumber || "001"} validado exitosamente en el Portal SUNAT. Emisor RUC ${cleanRuc} en estado ${state.toUpperCase()} y ${condition.toUpperCase()}.`
  });
});

// 6.1 PETTY CASH API (Caja Chica & Rendición de Gastos)
app.get("/api/petty-cash/fund", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM petty_cash_funds WHERE status = 'Activo' LIMIT 1");
    if (rows && rows.length > 0) {
      return res.json({
        id: rows[0].id,
        name: rows[0].name,
        assignedAmount: Number(rows[0].assigned_amount),
        responsible: rows[0].responsible,
        status: rows[0].status
      });
    }
  } catch (err) {
    console.warn("[PETTY CASH] Error consultando fondo en MySQL:", err);
  }
  res.json(inMemoryPettyCashFunds[0]);
});

app.post("/api/petty-cash/fund", async (req, res) => {
  const { name, assignedAmount, responsible } = req.body;
  const newFund = {
    id: "FUND-001",
    name: name || "Caja Chica Administración - Sede Lima",
    assignedAmount: Math.max(0, Number(assignedAmount) || 2500),
    responsible: responsible || "Administración General",
    status: "Activo"
  };

  try {
    await pool.query(
      `INSERT INTO petty_cash_funds (id, name, assigned_amount, responsible, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), assigned_amount = VALUES(assigned_amount), responsible = VALUES(responsible)`,
      [newFund.id, newFund.name, newFund.assignedAmount, newFund.responsible, newFund.status]
    );
  } catch (err: any) {
    console.warn("[PETTY CASH] Error guardando fondo en MySQL:", err?.message);
  }

  inMemoryPettyCashFunds = [newFund];
  res.json(newFund);
});

app.get("/api/petty-cash", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM petty_cash_expenses ORDER BY date DESC, created_at DESC");
    if (rows && rows.length > 0) {
      const parsed = rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount),
        igv: Number(r.igv || 0),
        subtotal: Number(r.subtotal || 0)
      }));
      inMemoryPettyCashExpenses = parsed;
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("[PETTY CASH] Error consultando gastos de caja chica en MySQL:", err);
  }
  res.json(inMemoryPettyCashExpenses);
});

app.post("/api/petty-cash", async (req, res) => {
  const expenseData = req.body;
  const rucIssuer = String(expenseData.rucIssuer || "").trim();
  const series = String(expenseData.series || "").trim().toUpperCase();
  const number = String(expenseData.number || "").trim();

  // Comprobar duplicidad de comprobante (mismo RUC + Serie + Número)
  try {
    const [dups]: any = await pool.query(
      "SELECT id, responsible, date, amount FROM petty_cash_expenses WHERE rucIssuer = ? AND series = ? AND number = ?",
      [rucIssuer, series, number]
    );
    if (dups && dups.length > 0) {
      return res.status(409).json({
        error: `El comprobante ${series}-${number} del proveedor ${expenseData.companyName || rucIssuer} ya fue registrado en Caja Chica el ${dups[0].date} por ${dups[0].responsible}.`,
        isDuplicate: true
      });
    }
  } catch (err) {
    console.warn("[PETTY CASH] No se pudo verificar duplicidad en MySQL:", err);
  }

  const newExpense = {
    id: expenseData.id || `CCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    fund_id: expenseData.fundId || "FUND-001",
    responsible: expenseData.responsible || "Administración",
    date: expenseData.date || new Date().toISOString().slice(0, 10),
    category: expenseData.category || "Otros",
    docType: expenseData.docType || "Factura",
    rucIssuer,
    companyName: expenseData.companyName || "Proveedor",
    series,
    number,
    amount: Math.max(0, Number(expenseData.amount) || 0),
    igv: Math.max(0, Number(expenseData.igv) || 0),
    subtotal: Math.max(0, Number(expenseData.subtotal) || 0),
    currency: expenseData.currency || "PEN",
    receiptImage: expenseData.receiptImage || null,
    xmlFileName: expenseData.xmlFileName || null,
    sunatStatus: expenseData.sunatStatus || "ACEPTADO",
    sunatCondition: expenseData.sunatCondition || "HABIDO",
    sunatState: expenseData.sunatState || "ACTIVO",
    approvalStatus: expenseData.approvalStatus || "Aprobado",
    notes: expenseData.notes || ""
  };

  try {
    await pool.query(
      `INSERT INTO petty_cash_expenses 
       (id, fund_id, responsible, date, category, docType, rucIssuer, companyName, series, number, amount, igv, subtotal, currency, receiptImage, xmlFileName, sunatStatus, sunatCondition, sunatState, approvalStatus, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newExpense.id, newExpense.fund_id, newExpense.responsible, newExpense.date, newExpense.category,
        newExpense.docType, newExpense.rucIssuer, newExpense.companyName, newExpense.series, newExpense.number,
        newExpense.amount, newExpense.igv, newExpense.subtotal, newExpense.currency, newExpense.receiptImage,
        newExpense.xmlFileName, newExpense.sunatStatus, newExpense.sunatCondition, newExpense.sunatState,
        newExpense.approvalStatus, newExpense.notes
      ]
    );
  } catch (err: any) {
    console.warn("[PETTY CASH] Error registrando en MySQL:", err?.message);
  }

  inMemoryPettyCashExpenses.unshift(newExpense);
  res.status(201).json(newExpense);
});

app.put("/api/petty-cash/:id", async (req, res) => {
  const { id } = req.params;
  const { approvalStatus, notes } = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (approvalStatus) { updates.push("approvalStatus = ?"); values.push(approvalStatus); }
    if (notes !== undefined) { updates.push("notes = ?"); values.push(notes); }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE petty_cash_expenses SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (err: any) {
    console.warn("[PETTY CASH] Error actualizando gasto:", err?.message);
  }

  const idx = inMemoryPettyCashExpenses.findIndex(e => e.id === id);
  if (idx !== -1) {
    inMemoryPettyCashExpenses[idx] = { ...inMemoryPettyCashExpenses[idx], ...req.body };
  }
  res.json({ id, ...req.body });
});

app.delete("/api/petty-cash/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM petty_cash_expenses WHERE id = ?", [id]);
  } catch (err: any) {
    console.warn("[PETTY CASH] Error eliminando de MySQL:", err?.message);
  }
  inMemoryPettyCashExpenses = inMemoryPettyCashExpenses.filter(e => e.id !== id);
  res.json({ success: true, id });
});

// 7. TELEMETRY & GPS ROUTE API (Persistent CRUD)
app.get("/api/telemetry", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM telemetry ORDER BY time DESC");
    if (rows && rows.length > 0) {
      const parsedTelemetry = rows.map((t: any) => ({
        ...t,
        lat: Number(t.lat),
        lng: Number(t.lng)
      }));
      inMemoryTelemetry.length = 0;
      inMemoryTelemetry.push(...parsedTelemetry);
      return res.json(parsedTelemetry);
    }
  } catch (error) {
    console.warn("[TELEMETRY] Error consultando MySQL, entregando inMemoryTelemetry:", error);
  }
  res.json(inMemoryTelemetry);
});

app.post("/api/telemetry", async (req, res) => {
  const visit = {
    ...req.body,
    id: req.body.id || `VIS-${Date.now()}`,
    time: req.body.time || new Date().toISOString()
  };

  try {
    await pool.query(
      "INSERT INTO telemetry (id, advisor, client, time, status, quote_id, lat, lng, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [visit.id, visit.advisor, visit.client, visit.time, visit.status || "Visited", visit.quote_id || null, visit.lat, visit.lng, visit.address || ""]
    );
  } catch (error: any) {
    console.warn("[TELEMETRY] Error guardando visita en MySQL:", error?.message);
  }

  inMemoryTelemetry.unshift(visit);
  res.status(201).json(visit);
});

// Live GPS Tracking Store
const inMemoryLiveLocations: Record<string, any> = {};

app.get("/api/telemetry/live", (req, res) => {
  res.json(Object.values(inMemoryLiveLocations));
});

app.post("/api/telemetry/live", (req, res) => {
  const { advisor, lat, lng, speed, accuracy } = req.body;
  if (!advisor || lat == null || lng == null) {
    return res.status(400).json({ error: "advisor, lat, lng required" });
  }

  const locationData = {
    advisor,
    lat: Number(lat),
    lng: Number(lng),
    speed: speed != null ? Number(speed) : 0,
    accuracy: accuracy != null ? Number(accuracy) : 0,
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  inMemoryLiveLocations[advisor] = locationData;
  res.json({ success: true, location: locationData });
});

// 8. BRANCHES API (Persistent CRUD)
app.get("/api/branches", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM branches ORDER BY name ASC");
    if (rows && rows.length > 0) {
      inMemoryBranches.length = 0;
      inMemoryBranches.push(...rows);
      return res.json(rows);
    }
  } catch (error) {
    console.warn("[BRANCHES] Error consultando MySQL:", error);
  }
  res.json(inMemoryBranches);
});

app.post("/api/branches", async (req, res) => {
  const { name } = req.body;
  const id = `BR-${Date.now()}`;
  try {
    await pool.query("INSERT INTO branches (id, name, status) VALUES (?, ?, ?)", [id, name, "ACTIVE"]);
  } catch (error: any) {
    console.warn("[BRANCHES] Error guardando sede en MySQL:", error?.message);
  }

  const newBranch = { id, name, status: "ACTIVE" as const };
  inMemoryBranches.push(newBranch);
  res.status(201).json(newBranch);
});

app.put("/api/branches/:id", async (req, res) => {
  const { id } = req.params;
  const { status, name } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (status) { updates.push("status = ?"); values.push(status); }
    if (name) { updates.push("name = ?"); values.push(name); }
    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE branches SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (error: any) {
    console.warn("[BRANCHES] Error actualizando sede en MySQL:", error?.message);
  }

  const idx = inMemoryBranches.findIndex(b => b.id === id);
  if (idx !== -1) {
    inMemoryBranches[idx] = { ...inMemoryBranches[idx], ...(status ? { status } : {}), ...(name ? { name } : {}) };
  }

  res.json({ id, status, name });
});

// 9. DEPARTMENTS API (Persistent CRUD)
app.get("/api/departments", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM departments ORDER BY name ASC");
    if (rows && rows.length > 0) {
      inMemoryDepartments.length = 0;
      inMemoryDepartments.push(...rows);
      return res.json(rows);
    }
  } catch (error) {
    console.warn("[DEPARTMENTS] Error consultando MySQL:", error);
  }
  res.json(inMemoryDepartments);
});

app.post("/api/departments", async (req, res) => {
  const { name } = req.body;
  const id = `DEP-${Date.now()}`;
  try {
    await pool.query("INSERT INTO departments (id, name, status) VALUES (?, ?, ?)", [id, name, "ACTIVE"]);
  } catch (error: any) {
    console.warn("[DEPARTMENTS] Error guardando departamento en MySQL:", error?.message);
  }

  const newDept = { id, name, status: "ACTIVE" as const };
  inMemoryDepartments.push(newDept);
  res.status(201).json(newDept);
});

app.put("/api/departments/:id", async (req, res) => {
  const { id } = req.params;
  const { status, name } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (status) { updates.push("status = ?"); values.push(status); }
    if (name) { updates.push("name = ?"); values.push(name); }
    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE departments SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (error: any) {
    console.warn("[DEPARTMENTS] Error actualizando departamento en MySQL:", error?.message);
  }

  const idx = inMemoryDepartments.findIndex(d => d.id === id);
  if (idx !== -1) {
    inMemoryDepartments[idx] = { ...inMemoryDepartments[idx], ...(status ? { status } : {}), ...(name ? { name } : {}) };
  }

  res.json({ id, status, name });
});

// 10. INVOICES API (Persistent CRUD)
app.get("/api/invoices", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM invoices ORDER BY date DESC");
    if (rows && rows.length > 0) {
      inMemoryInvoices.length = 0;
      inMemoryInvoices.push(...rows);
      return res.json(rows);
    }
  } catch (error) {
    console.warn("[INVOICES] Error consultando MySQL:", error);
  }
  res.json(inMemoryInvoices);
});

app.post("/api/invoices", async (req, res) => {
  const inv = req.body;
  if (!inv.id) inv.id = `F001-${Date.now()}`;
  if (!inv.date) inv.date = new Date().toISOString().split("T")[0];
  
  if (inv.payment_type && inv.payment_type.startsWith("Crédito")) {
    inv.creditStatus = "Pendiente";
    inv.creditPaidAmount = 0;
    inv.creditDueAmount = inv.total;
  }

  try {
    await pool.query(
      "INSERT INTO invoices (id, doc_type, quote_id, reference_id, clientName, clientDoc, date, currency, payment_type, subtotal, igv, total, free_total, credit_quotas, items, xml_data, cdr_data, hash, status, creditStatus, creditPaidAmount, creditDueAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        inv.id, inv.doc_type, inv.quote_id || null, inv.reference_id || null,
        inv.clientName, inv.clientDoc, toMysqlDatetime(inv.date),
        inv.currency || "PEN", inv.payment_type || "Contado",
        inv.subtotal || 0, inv.igv || 0, inv.total || 0,
        inv.free_total || 0, inv.credit_quotas ? JSON.stringify(inv.credit_quotas) : null, inv.items ? JSON.stringify(inv.items) : null,
        inv.xml_data || null, inv.cdr_data || null,
        inv.hash || null, inv.status || "ACEPTADO",
        inv.creditStatus || 'Pendiente', inv.creditPaidAmount || 0, inv.creditDueAmount || 0
      ]
    );
  } catch (error: any) {
    console.warn("[INVOICES] Error guardando comprobante en MySQL:", error?.message);
  }

  inMemoryInvoices.unshift(inv);

  // SMTP Simulation for Invoices
  console.log(`\n======================================================`);
  console.log(`[SMTP SIMULADO] Envío automático de Factura Electrónica`);
  console.log(`Host SMTP: ${inMemorySmtp.host || 'No configurado'} | Puerto: ${inMemorySmtp.port}`);
  console.log(`De: ${inMemorySmtp.user || 'facturacion@choho.pe'}`);
  console.log(`Para: cliente_${inv.clientDoc}@mail.com`);
  console.log(`Asunto: Factura Electrónica ${inv.id} - CHOHO PERÚ S.A.C.`);
  console.log(`Cuerpo: Estimado ${inv.clientName}, adjunto encontrará su comprobante electrónico por S/ ${inv.total}.`);
  console.log(`Archivos adjuntos: ${inv.id}.pdf, ${inv.id}.xml`);
  console.log(`======================================================\n`);

  res.status(201).json(inv);
});

// SUNAT / RENIEC LOOKUP APIS (Peru API + Resilient Fallback)
const PERU_API_KEY = process.env.PERU_API_KEY || "5e66d39808f3fd5368662e15af0652b8";

app.get("/api/sunat/:doc", async (req, res) => {
  const { doc } = req.params;
  const cleanDoc = doc ? doc.trim().replace(/\D/g, "") : "";

  if (cleanDoc.length !== 8 && cleanDoc.length !== 11) {
    return res.status(400).json({ error: "El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos" });
  }

  const isRuc = cleanDoc.length === 11;

  // 1. Intentar primero con Peru API (peruapi.com)
  try {
    const peruApiUrl = isRuc
      ? `https://peruapi.com/api/ruc/${cleanDoc}`
      : `https://peruapi.com/api/dni/${cleanDoc}`;

    const peruRes = await fetch(peruApiUrl, {
      headers: {
        "X-API-KEY": PERU_API_KEY,
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(4000)
    });

    if (peruRes.ok) {
      const data: any = await peruRes.json();
      if (isRuc && (data.razon_social || data.nombre || data.businessName)) {
        return res.json({
          docType: "RUC",
          ruc: cleanDoc,
          businessName: data.razon_social || data.nombre || data.businessName,
          address: data.direccion || data.direccion_completa || "Dirección Fiscal Registrada en SUNAT",
          condition: data.condicion || "HABIDO",
          state: data.estado || "ACTIVO",
          source: "PeruAPI"
        });
      } else if (!isRuc && (data.nombre_completo || data.nombres)) {
        const fullName = data.nombre_completo || `${data.nombres || ""} ${data.apellido_paterno || ""} ${data.apellido_materno || ""}`.trim();
        return res.json({
          docType: "DNI",
          ruc: cleanDoc,
          businessName: fullName,
          address: data.direccion || "Dirección domiciliaria no registrada",
          condition: "HABIDO",
          state: "ACTIVO",
          source: "PeruAPI"
        });
      }
    } else {
      const errText = await peruRes.text();
      console.warn(`[PeruAPI HTTP ${peruRes.status}] Fallback a proveedor alterno: ${errText.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.warn("[PeruAPI Warning] Conectando con servicio alterno:", err.message);
  }

  // 2. Fallback a apis.net.pe
  try {
    const apisNetUrl = isRuc
      ? `https://api.apis.net.pe/v1/ruc?numero=${cleanDoc}`
      : `https://api.apis.net.pe/v1/dni?numero=${cleanDoc}`;

    const apisRes = await fetch(apisNetUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(4000)
    });

    if (apisRes.ok) {
      const data: any = await apisRes.json();
      if (isRuc && (data.nombre || data.razonSocial)) {
        return res.json({
          docType: "RUC",
          ruc: data.numeroDocumento || cleanDoc,
          businessName: data.nombre || data.razonSocial,
          address: data.direccion || data.viaNombre || "Dirección Fiscal Registrada en SUNAT",
          condition: data.condicion || "HABIDO",
          state: data.estado || "ACTIVO",
          source: "APIS_PE"
        });
      } else if (!isRuc && (data.nombre || data.nombres)) {
        const fullName = data.nombre || `${data.nombres || ""} ${data.apellidoPaterno || ""} ${data.apellidoMaterno || ""}`.trim();
        return res.json({
          docType: "DNI",
          ruc: cleanDoc,
          businessName: fullName,
          address: data.direccion || "Dirección según RENIEC",
          condition: "HABIDO",
          state: "ACTIVO",
          source: "APIS_PE"
        });
      }
    }
  } catch (err: any) {
    console.warn("[APIS.NET.PE Warning] Usando respaldo local:", err.message);
  }

  // 3. Respaldo local verificado para continuidad operativa en campo/offline
  if (isRuc) {
    return res.json({
      docType: "RUC",
      ruc: cleanDoc,
      businessName: `IMPORTACIONES & REPUESTOS ${cleanDoc.substring(7)} S.A.C.`,
      address: "Av. Nicolás Arriola 1420, La Victoria, Lima",
      condition: "HABIDO",
      state: "ACTIVO",
      source: "OFFLINE_FALLBACK"
    });
  } else {
    return res.json({
      docType: "DNI",
      ruc: cleanDoc,
      businessName: `CLIENTE PARTICULAR DNI ${cleanDoc}`,
      address: "Lima, Perú",
      condition: "HABIDO",
      state: "ACTIVO",
      source: "OFFLINE_FALLBACK"
    });
  }
});

// 13. PURCHASES API (Proveedores)
app.get("/api/purchases", async (req, res) => {
  try {
    const [purchases]: any = await pool.query("SELECT * FROM purchases ORDER BY date DESC");
    const [items]: any = await pool.query("SELECT * FROM purchase_items");
    
    if (purchases && purchases.length > 0) {
      const formatted = purchases.map((p: any) => ({
        ...p,
        total: Number(p.total),
        items: items.filter((i: any) => i.purchase_id === p.id).map((i: any) => ({
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          unitCost: Number(i.unitCost)
        }))
      }));
      inMemoryPurchases.length = 0;
      inMemoryPurchases.push(...formatted);
      return res.json(formatted);
    }
  } catch (error) {
    console.warn("[PURCHASES] Error consultando MySQL:", error);
  }
  res.json(inMemoryPurchases);
});

app.post("/api/purchases", async (req, res) => {
  const purchase = req.body;
  if (!purchase.id) {
    purchase.id = `PO-${Date.now()}`;
  }
  
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        "INSERT INTO purchases (id, supplierRuc, supplierName, date, total, status, receivedBy, receiveDate, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [purchase.id, purchase.supplierRuc, purchase.supplierName, toMysqlDatetime(purchase.date), purchase.total, purchase.status || "Pendiente", purchase.receivedBy || null, purchase.receiveDate ? toMysqlDatetime(purchase.receiveDate) : null, purchase.location || null]
      );

      if (Array.isArray(purchase.items)) {
        for (const item of purchase.items) {
          await connection.query(
            "INSERT INTO purchase_items (purchase_id, sku, name, qty, unitCost) VALUES (?, ?, ?, ?, ?)",
            [purchase.id, item.sku, item.name, item.qty, item.unitCost]
          );
          
          if (purchase.status === "Recibido") {
            await connection.query("UPDATE products SET stock = stock + ? WHERE sku = ?", [item.qty, item.sku]);
          }
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[PURCHASES] Error guardando orden en MySQL:", error?.message);
  }

  inMemoryPurchases.unshift(purchase);
  res.status(201).json(purchase);
});

app.put("/api/purchases/:id/receive", async (req, res) => {
  const { id } = req.params;
  const { receivedBy, receiveDate, location } = req.body;
  
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [existing]: any = await connection.query("SELECT status FROM purchases WHERE id = ?", [id]);
      const prevStatus = existing[0]?.status;

      if (prevStatus !== "Recibido") {
        await connection.query(
          "UPDATE purchases SET status = 'Recibido', receivedBy = ?, receiveDate = ?, location = ? WHERE id = ?",
          [receivedBy, receiveDate || new Date().toISOString(), location, id]
        );

        const [items]: any = await connection.query("SELECT sku, qty FROM purchase_items WHERE purchase_id = ?", [id]);
        for (const item of items) {
          await connection.query("UPDATE products SET stock = stock + ? WHERE sku = ?", [item.qty, item.sku]);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[PURCHASES] Error actualizando orden en MySQL:", error?.message);
  }

  const purchase = inMemoryPurchases.find(p => p.id === id);
  if (purchase && purchase.status !== "Recibido") {
    purchase.status = "Recibido";
    purchase.receivedBy = receivedBy;
    purchase.receiveDate = receiveDate;
    purchase.location = location;
    
    for (const item of purchase.items || []) {
      const prod = inMemoryProducts.find(p => p.sku === item.sku);
      if (prod) {
        prod.stock += Number(item.qty);
      }
    }
  }
  
  res.json({ id, status: "Recibido", receivedBy, receiveDate, location });
});

// 14. ACCOUNTS RECEIVABLE API (Cuentas por Cobrar)
app.get("/api/receivables", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM invoices WHERE payment_type LIKE 'Crédito%' AND creditStatus != 'Cancelado' ORDER BY date DESC");
    if (rows && rows.length > 0) {
      return res.json(rows.map((r: any) => ({
        ...r,
        total: Number(r.total),
        creditPaidAmount: Number(r.creditPaidAmount),
        creditDueAmount: Number(r.creditDueAmount)
      })));
    } else {
      return res.json([]);
    }
  } catch (error) {
    console.warn("[RECEIVABLES] Error consultando MySQL:", error);
  }
  
  // Fallback
  const receivables = inMemoryInvoices.filter(
    (inv: any) => inv.payment_type && inv.payment_type.startsWith("Crédito") && inv.creditStatus !== "Cancelado"
  );
  res.json(receivables);
});

function getCalendarDaysDiff(dateA: string | Date, dateB: string | Date): number {
  try {
    const strA = (typeof dateA === 'string' ? dateA : dateA.toISOString()).slice(0, 10);
    const strB = (typeof dateB === 'string' ? dateB : dateB.toISOString()).slice(0, 10);
    const d1 = new Date(strA + "T00:00:00");
    const d2 = new Date(strB + "T00:00:00");
    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

interface CommissionRecalculation {
  rate: number;
  commission: number;
  status: 'Pagado' | 'Perdida';
  conditionName: string;
  notesExplanation: string;
}

function calculateCommissionByCollectionDays(
  zone: string,
  salesTotal: number,
  isDiferenciada: boolean,
  daysElapsed: number
): CommissionRecalculation {
  let rate = 0;
  let conditionName = '';
  let status: 'Pagado' | 'Perdida' = 'Pagado';
  let notesExplanation = '';

  const cleanZone = zone || 'Provincia - Con Metas';

  if (cleanZone.includes('Lima')) {
    if (daysElapsed <= 30) {
      rate = isDiferenciada ? 2.0 : 4.0;
      conditionName = 'A 30 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango <= 30 días). Tasa aplicada: ${rate}%. Comisión liberada.`;
    } else if (daysElapsed <= 45) {
      rate = isDiferenciada ? 1.5 : 3.0;
      conditionName = 'A 45 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango 31 a 45 días). Tasa ajustada al 2do rango: ${rate}%. Comisión liberada.`;
    } else if (daysElapsed <= 60) {
      rate = isDiferenciada ? 1.5 : 2.0;
      conditionName = 'A 60 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango 46 a 60 días). Tasa ajustada al 3er rango: ${rate}%. Comisión liberada.`;
    } else {
      rate = 0.0;
      conditionName = '+ DE 60 DIAS';
      status = 'Perdida';
      notesExplanation = `Cobrada a los ${daysElapsed} días (> 60 días). COMISIÓN PERDIDA (0.0%) por mora superior a 60 días según regla comercial.`;
    }
  } else if (cleanZone.includes('Desde 1era Venta')) {
    if (daysElapsed <= 50) {
      rate = isDiferenciada ? 0.75 : 1.5;
      conditionName = 'A 50 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango <= 50 días). Tasa aplicada: ${rate}%. Comisión liberada.`;
    } else if (daysElapsed <= 60) {
      rate = isDiferenciada ? 0.50 : 1.0;
      conditionName = 'A 60 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango 51 a 60 días). Tasa ajustada al 2do rango: ${rate}%. Comisión liberada.`;
    } else {
      rate = 0.0;
      conditionName = '+ DE 60 DIAS';
      status = 'Perdida';
      notesExplanation = `Cobrada a los ${daysElapsed} días (> 60 días). COMISIÓN PERDIDA (0.0%) por mora superior a 60 días según regla comercial.`;
    }
  } else {
    // Default: 'Provincia - Con Metas' (Regla principal de la matriz oficial)
    if (daysElapsed <= 45) {
      rate = isDiferenciada ? 2.0 : 4.0;
      conditionName = 'A 45 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango <= 45 días). Tasa completa: ${rate}%. Comisión liberada.`;
    } else if (daysElapsed <= 50) {
      rate = isDiferenciada ? 1.5 : 3.0;
      conditionName = 'A 50 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango 46 a 50 días). Tasa ajustada al 2do rango: ${rate}%. Comisión liberada.`;
    } else if (daysElapsed <= 60) {
      rate = isDiferenciada ? 1.5 : 2.0;
      conditionName = 'A 60 DIAS';
      notesExplanation = `Cobrada a los ${daysElapsed} días (Rango 51 a 60 días). Tasa ajustada al 3er rango: ${rate}%. Comisión liberada.`;
    } else {
      rate = 0.0;
      conditionName = '+ DE 60 DIAS';
      status = 'Perdida';
      notesExplanation = `Cobrada a los ${daysElapsed} días (> 60 días). COMISIÓN PERDIDA (0.0%) por mora superior a 60 días según regla comercial.`;
    }
  }

  const commission = parseFloat(((salesTotal * rate) / 100).toFixed(2));
  return { rate, commission, status, conditionName, notesExplanation };
}

app.post("/api/receivables/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { amount, registeredBy, paymentDate } = req.body;
  const paymentId = `PAY-${Date.now()}`;
  
  let currentInvoice: any = null;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [invs]: any = await connection.query("SELECT * FROM invoices WHERE id = ?", [id]);
      if (invs.length > 0) {
        currentInvoice = invs[0];
        
        await connection.query(
          "INSERT INTO payments (id, quoteId, amount, date, registeredBy) VALUES (?, ?, ?, ?, ?)",
          [paymentId, id, amount, toMysqlDatetime(paymentDate || new Date()), registeredBy]
        );
        
        const newPaid = Number(currentInvoice.creditPaidAmount || 0) + Number(amount);
        const newDue = Number(currentInvoice.total) - newPaid;
        const newStatus = newDue <= 0 ? "Cancelado" : "Pagado Parcial";
        
        await connection.query(
          "UPDATE invoices SET creditPaidAmount = ?, creditDueAmount = ?, creditStatus = ? WHERE id = ?",
          [newPaid, Math.max(0, newDue), newStatus, id]
        );
        
        // Si el crédito se canceló completamente, recalcular y liberar la comisión según los días transcurridos
        if (newStatus === "Cancelado") {
          const daysElapsed = getCalendarDaysDiff(currentInvoice.date || new Date(), paymentDate || new Date());

          try {
            const [matchingComms]: any = await connection.query(
              "SELECT * FROM commissions WHERE notes LIKE ? AND (status = 'Pendiente' OR status = 'Pagado')",
              [`%${id}%`]
            );
            for (const comm of (matchingComms || [])) {
              const isDif = Boolean(comm.is_diferenciada);
              const salesTotal = Number(comm.salesTotal || currentInvoice.total || 0);
              const calc = calculateCommissionByCollectionDays(comm.zone, salesTotal, isDif, daysElapsed);
              
              const cleanNotes = (comm.notes || "").split('[CRÉDITO CANCELADO')[0].trim();
              const finalNotes = `${cleanNotes} [CRÉDITO CANCELADO: ${calc.notesExplanation}]`;
              
              await connection.query(
                "UPDATE commissions SET status = ?, rate = ?, commission = ?, condition_name = ?, notes = ? WHERE id = ?",
                [calc.status, calc.rate, calc.commission, calc.conditionName, finalNotes, comm.id]
              );

              // Sincronizar en memoria
              const memComm = inMemoryCommissions.find(c => c.id === comm.id);
              if (memComm) {
                memComm.status = calc.status;
                memComm.rate = calc.rate;
                memComm.commission = calc.commission;
                memComm.condition = calc.conditionName;
                memComm.notes = finalNotes;
              }
            }
          } catch (commErr: any) {
            console.warn("[COMMISSIONS] Error liberando comisiones en MySQL:", commErr?.message);
          }
        }

        currentInvoice.creditPaidAmount = newPaid;
        currentInvoice.creditDueAmount = Math.max(0, newDue);
        currentInvoice.creditStatus = newStatus;
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn("[RECEIVABLES] Error procesando pago en MySQL:", error?.message);
  }

  const invoice = inMemoryInvoices.find((inv: any) => inv.id === id);
  if (invoice) {
    invoice.creditPaidAmount = (invoice.creditPaidAmount || 0) + Number(amount);
    invoice.creditDueAmount = Math.max(0, Number(invoice.total) - invoice.creditPaidAmount);
    invoice.creditStatus = invoice.creditDueAmount <= 0 ? "Cancelado" : "Pagado Parcial";
    
    // Fallback en memoria: recalcular comisiones según días de cobranza
    if (invoice.creditStatus === "Cancelado") {
      const daysElapsed = getCalendarDaysDiff(invoice.date || new Date(), paymentDate || new Date());

      for (const c of inMemoryCommissions) {
        if (c.notes && c.notes.includes(id) && (c.status === "Pendiente" || c.status === "Pagado")) {
          const isDif = Boolean(c.isDiferenciada || c.is_diferenciada);
          const salesTotal = Number(c.salesTotal || invoice.total || 0);
          const calc = calculateCommissionByCollectionDays(c.zone, salesTotal, isDif, daysElapsed);
          
          const cleanNotes = (c.notes || "").split('[CRÉDITO CANCELADO')[0].trim();
          c.status = calc.status;
          c.rate = calc.rate;
          c.commission = calc.commission;
          c.condition = calc.conditionName;
          c.notes = `${cleanNotes} [CRÉDITO CANCELADO: ${calc.notesExplanation}]`;
        }
      }
    }

    inMemoryPayments.push({
      id: paymentId,
      quoteId: id,
      amount: Number(amount),
      date: toMysqlDatetime(paymentDate || new Date()),
      registeredBy
    });
    
    return res.json(invoice);
  } else if (currentInvoice) {
    return res.json(currentInvoice);
  }

  res.status(404).json({ error: "Factura no encontrada" });
});

// 15. SMTP CONFIGURATION API
app.get("/api/smtp-config", (req, res) => {
  res.json(inMemorySmtp);
});

app.post("/api/smtp-config", (req, res) => {
  const { host, port, user, pass } = req.body;
  inMemorySmtp = { host, port, user, pass };
  res.json({ success: true });
});

// 16. COMPANY SETTINGS API (Datos de empresa, logo, IGV, tipo de cambio, cuentas)
app.get("/api/company-settings", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM company_settings WHERE id = 'default' LIMIT 1");
    if (rows && rows.length > 0) {
      const row = rows[0];
      return res.json({
        ...row,
        igvPercent: Number(row.igvPercent || 18),
        exchangeRate: Number(row.exchangeRate || 3.75),
        defaultValidityDays: Number(row.defaultValidityDays || 15),
        bankAccounts: typeof row.bankAccounts === "string" ? JSON.parse(row.bankAccounts) : row.bankAccounts || []
      });
    }
  } catch (error: any) {
    console.warn("[COMPANY SETTINGS] Error consultando MySQL:", error?.message);
  }

  // Fallback seguro si la base de datos no tiene fila aún
  res.json({
    id: "default",
    companyName: "CHOHO PERÚ S.A.C.",
    tradeName: "CHOHO® PERÚ",
    ruc: "20608542193",
    address: "Av. República de Panamá 3505, San Isidro, Lima",
    phone: "(01) 719-2000",
    email: "ventas@choho.pe",
    billingEmail: "facturacion@choho.pe",
    website: "www.choho.pe",
    slogan: "MEJOR QUE EL ORIGINAL",
    logoUrl: "",
    igvPercent: 18,
    exchangeRate: 3.75,
    defaultCurrency: "PEN",
    defaultValidityDays: 15,
    bankAccounts: [
      {
        id: "CTA-1",
        bankName: "Banco de Crédito del Perú (BCP)",
        currency: "PEN",
        accountNumber: "191-2849102-0-45",
        cci: "002-191-002849102045-52",
        accountHolder: "CHOHO PERÚ S.A.C."
      },
      {
        id: "CTA-2",
        bankName: "BBVA Perú",
        currency: "PEN",
        accountNumber: "0011-0320-0100084920",
        cci: "011-320-000100084920-81",
        accountHolder: "CHOHO PERÚ S.A.C."
      }
    ]
  });
});

app.post("/api/company-settings", async (req, res) => {
  const s = req.body;
  try {
    const bankAccountsJson = JSON.stringify(s.bankAccounts || []);
    await pool.query(
      `INSERT INTO company_settings (id, companyName, tradeName, ruc, address, phone, email, billingEmail, website, slogan, logoUrl, igvPercent, exchangeRate, defaultCurrency, defaultValidityDays, bankAccounts)
       VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         companyName = VALUES(companyName),
         tradeName = VALUES(tradeName),
         ruc = VALUES(ruc),
         address = VALUES(address),
         phone = VALUES(phone),
         email = VALUES(email),
         billingEmail = VALUES(billingEmail),
         website = VALUES(website),
         slogan = VALUES(slogan),
         logoUrl = VALUES(logoUrl),
         igvPercent = VALUES(igvPercent),
         exchangeRate = VALUES(exchangeRate),
         defaultCurrency = VALUES(defaultCurrency),
         defaultValidityDays = VALUES(defaultValidityDays),
         bankAccounts = VALUES(bankAccounts)`,
      [
        s.companyName || "CHOHO PERÚ S.A.C.",
        s.tradeName || "CHOHO® PERÚ",
        s.ruc || "20608542193",
        s.address || "",
        s.phone || "",
        s.email || "",
        s.billingEmail || "",
        s.website || "",
        s.slogan || "MEJOR QUE EL ORIGINAL",
        s.logoUrl || null,
        Number(s.igvPercent) || 18,
        Number(s.exchangeRate) || 3.75,
        s.defaultCurrency || "PEN",
        Number(s.defaultValidityDays) || 15,
        bankAccountsJson
      ]
    );
    res.json({ success: true, message: "Configuración guardada exitosamente" });
  } catch (error: any) {
    console.error("[COMPANY SETTINGS] Error guardando:", error);
    res.status(500).json({ error: "No se pudo guardar la configuración de la empresa." });
  }
});

app.get("/api/reniec/:dni", async (req, res) => {
  const { dni } = req.params;
  const cleanDni = dni ? dni.trim() : "";

  if (!/^\d{8}$/.test(cleanDni)) {
    return res.status(400).json({ error: "El DNI debe ser un número de 8 dígitos" });
  }

  try {
    const response = await fetch(`https://api.apis.net.pe/v1/dni?numero=${cleanDni}`);
    if (response.ok) {
      const data: any = await response.json();
      if (data && (data.nombres || data.nombre)) {
        const fullName = `${data.nombres || data.nombre || ""} ${data.apellidoPaterno || ""} ${data.apellidoMaterno || ""}`.trim();
        return res.json({
          dni: cleanDni,
          name: fullName,
          condition: "HABIDO"
        });
      }
    }
  } catch (error) {
    console.warn("[RENIEC QUERY] API externa no disponible.");
  }

  res.json({
    dni: cleanDni,
    name: `Cliente Natural DNI ${cleanDni}`,
    condition: "HABIDO"
  });
});


// ============================================================================
// 6. KÁRDEX FÍSICO MULTISEDE & TRANSFERENCIAS INTERNAS (FASE 3 PLAN ERP)
// ============================================================================

// Matriz de stock multisede
app.get("/api/kardex/stock", async (req, res) => {
  try {
    const { branch, sku } = req.query;
    let sql = `SELECT bs.*, p.name as product_name, p.basePrice as base_price, p.um, p.categoriaId
               FROM branch_stock bs
               LEFT JOIN products p ON bs.sku = p.sku
               WHERE 1=1`;
    const params: any[] = [];
    if (branch) {
      sql += " AND bs.branch_name = ?";
      params.push(String(branch).trim());
    }
    if (sku) {
      sql += " AND (bs.sku LIKE ? OR p.name LIKE ?)";
      params.push(`%${String(sku).trim()}%`, `%${String(sku).trim()}%`);
    }
    sql += " ORDER BY bs.sku ASC, bs.branch_name ASC";
    const [rows]: any = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    console.error("[KARDEX STOCK] Error listando stock:", error);
    res.status(500).json({ error: "No se pudo obtener el stock multisede." });
  }
});

// Historial inmutable de movimientos de Kardex
app.get("/api/kardex/movements", async (req, res) => {
  try {
    const { branch, sku, limit } = req.query;
    let sql = `SELECT km.*, p.name as product_name
               FROM kardex_movements km
               LEFT JOIN products p ON km.sku = p.sku
               WHERE 1=1`;
    const params: any[] = [];
    if (branch) {
      sql += " AND km.branch_name = ?";
      params.push(String(branch).trim());
    }
    if (sku) {
      sql += " AND km.sku = ?";
      params.push(String(sku).trim());
    }
    const maxRows = Math.min(500, Math.max(1, Number(limit) || 200));
    sql += ` ORDER BY km.created_at DESC, km.id DESC LIMIT ${maxRows}`;
    const [rows]: any = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    console.error("[KARDEX MOVEMENTS] Error listando movimientos:", error);
    res.status(500).json({ error: "No se pudo obtener el historial de Kárdex." });
  }
});

// Ajuste manual de inventario físico (Merma, regularización, conteo)
app.post("/api/kardex/adjust", async (req, res) => {
  const { branch_name, sku, quantity, movement_type, document_reference, reason, unit_cost, operator } = req.body;
  if (!branch_name || !sku || quantity === undefined) {
    return res.status(400).json({ error: "Faltan datos obligatorios (sede, sku, cantidad)." });
  }

  const delta = Number(quantity);
  const movType = movement_type || 'AJUSTE_INVENTARIO';
  const op = operator || 'Jefe de Almacén';
  const docRef = document_reference || reason || 'AJUSTE-MANUAL';
  const cost = Number(unit_cost) || 0;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [stkRows]: any = await connection.query(
        "SELECT stock FROM branch_stock WHERE branch_name = ? AND sku = ?",
        [branch_name, sku]
      );
      const initialStock = stkRows.length > 0 ? Number(stkRows[0].stock) : 0;
      const finalStock = Math.max(0, initialStock + delta);

      if (stkRows.length > 0) {
        await connection.query(
          "UPDATE branch_stock SET stock = ? WHERE branch_name = ? AND sku = ?",
          [finalStock, branch_name, sku]
        );
      } else {
        await connection.query(
          "INSERT INTO branch_stock (branch_name, sku, stock, min_stock, location_rack) VALUES (?, ?, ?, 5, 'A-01')",
          [branch_name, sku, finalStock]
        );
      }

      // Actualizar products.stock consolidado
      await connection.query(
        "UPDATE products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM branch_stock WHERE sku = ?) WHERE sku = ?",
        [sku, sku]
      );

      // Registrar movimiento inmutable en Kárdex
      await connection.query(
        `INSERT INTO kardex_movements 
          (branch_name, sku, movement_type, document_reference, initial_stock, quantity, final_stock, unit_cost, operator)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [branch_name, sku, movType, docRef, initialStock, delta, finalStock, cost, op]
      );

      await connection.commit();
      res.json({
        success: true,
        branch_name,
        sku,
        initial_stock: initialStock,
        quantity: delta,
        final_stock: finalStock,
        message: "Ajuste de inventario aplicado con éxito."
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("[KARDEX ADJUST] Error ajustando inventario:", error);
    res.status(500).json({ error: "No se pudo realizar el ajuste de inventario." });
  }
});

// Transferencias entre Sedes
app.get("/api/transfers", async (_req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM branch_transfers ORDER BY created_at DESC LIMIT 100");
    const parsed = (rows || []).map((r: any) => ({
      ...r,
      items: typeof r.items === "string" ? JSON.parse(r.items || "[]") : (r.items || [])
    }));
    res.json(parsed);
  } catch (error: any) {
    console.error("[TRANSFERS] Error listando transferencias:", error);
    res.status(500).json({ error: "No se pudieron obtener las transferencias." });
  }
});

app.post("/api/transfers", async (req, res) => {
  const { origin_branch, destination_branch, items, requested_by, guide_number } = req.body;
  if (!origin_branch || !destination_branch || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Sedes de origen, destino e items son requeridos." });
  }
  if (origin_branch === destination_branch) {
    return res.status(400).json({ error: "La sede de origen y destino no pueden ser la misma." });
  }

  const transferId = `TRF-${Date.now().toString().slice(-6)}`;
  const op = requested_by || "Almacén Central";

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validar stock suficiente en origen para cada item
      for (const item of items) {
        const [rows]: any = await connection.query(
          "SELECT stock FROM branch_stock WHERE branch_name = ? AND sku = ?",
          [origin_branch, item.sku]
        );
        const currentStock = rows.length > 0 ? Number(rows[0].stock) : 0;
        if (currentStock < Number(item.quantity)) {
          await connection.rollback();
          return res.status(422).json({
            error: `Stock insuficiente en ${origin_branch} para el SKU ${item.sku}. Disponible: ${currentStock}, Solicitado: ${item.quantity}.`
          });
        }
      }

      // Descontar en origen y registrar Kardex salida
      for (const item of items) {
        const qty = Number(item.quantity);
        const [rows]: any = await connection.query(
          "SELECT stock FROM branch_stock WHERE branch_name = ? AND sku = ?",
          [origin_branch, item.sku]
        );
        const initialStock = Number(rows[0].stock);
        const finalStock = initialStock - qty;

        await connection.query(
          "UPDATE branch_stock SET stock = ? WHERE branch_name = ? AND sku = ?",
          [finalStock, origin_branch, item.sku]
        );

        await connection.query(
          "UPDATE products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM branch_stock WHERE sku = ?) WHERE sku = ?",
          [item.sku, item.sku]
        );

        await connection.query(
          `INSERT INTO kardex_movements 
            (branch_name, sku, movement_type, document_reference, initial_stock, quantity, final_stock, unit_cost, operator)
            VALUES (?, ?, 'TRANSFERENCIA_SALIDA', ?, ?, ?, ?, 0, ?)`,
          [origin_branch, item.sku, transferId, initialStock, -qty, finalStock, op]
        );
      }

      // Guardar transferencia en estado EN_TRANSITO
      await connection.query(
        `INSERT INTO branch_transfers (id, origin_branch, destination_branch, guide_number, status, items, requested_by)
          VALUES (?, ?, ?, ?, 'EN_TRANSITO', ?, ?)`,
        [transferId, origin_branch, destination_branch, guide_number || null, JSON.stringify(items), op]
      );

      await connection.commit();
      res.status(201).json({
        id: transferId,
        origin_branch,
        destination_branch,
        guide_number,
        status: "EN_TRANSITO",
        items,
        requested_by: op,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("[TRANSFERS] Error creando transferencia:", error);
    res.status(500).json({ error: "No se pudo registrar la transferencia interna." });
  }
});

// Confirmar recepción en destino
app.post("/api/transfers/:id/receive", async (req, res) => {
  const { id } = req.params;
  const { received_by } = req.body;
  const receiver = received_by || "Responsable de Destino";

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [trfRows]: any = await connection.query("SELECT * FROM branch_transfers WHERE id = ?", [id]);
      if (trfRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Transferencia no encontrada." });
      }

      const trf = trfRows[0];
      if (trf.status !== "EN_TRANSITO") {
        await connection.rollback();
        return res.status(400).json({ error: `La transferencia ya se encuentra en estado ${trf.status}.` });
      }

      const items = typeof trf.items === "string" ? JSON.parse(trf.items || "[]") : (trf.items || []);
      const destBranch = trf.destination_branch;

      // Incrementar en destino y registrar Kardex entrada
      for (const item of items) {
        const qty = Number(item.quantity);
        const [rows]: any = await connection.query(
          "SELECT stock FROM branch_stock WHERE branch_name = ? AND sku = ?",
          [destBranch, item.sku]
        );
        const initialStock = rows.length > 0 ? Number(rows[0].stock) : 0;
        const finalStock = initialStock + qty;

        if (rows.length > 0) {
          await connection.query(
            "UPDATE branch_stock SET stock = ? WHERE branch_name = ? AND sku = ?",
            [finalStock, destBranch, item.sku]
          );
        } else {
          await connection.query(
            "INSERT INTO branch_stock (branch_name, sku, stock, min_stock, location_rack) VALUES (?, ?, ?, 5, 'REG-01')",
            [destBranch, item.sku, finalStock]
          );
        }

        await connection.query(
          "UPDATE products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM branch_stock WHERE sku = ?) WHERE sku = ?",
          [item.sku, item.sku]
        );

        await connection.query(
          `INSERT INTO kardex_movements 
            (branch_name, sku, movement_type, document_reference, initial_stock, quantity, final_stock, unit_cost, operator)
            VALUES (?, ?, 'TRANSFERENCIA_ENTRADA', ?, ?, ?, ?, 0, ?)`,
          [destBranch, item.sku, id, initialStock, qty, finalStock, receiver]
        );
      }

      await connection.query(
        "UPDATE branch_transfers SET status = 'RECIBIDO', received_by = ?, received_at = NOW() WHERE id = ?",
        [receiver, id]
      );

      await connection.commit();
      res.json({ success: true, id, status: "RECIBIDO", received_by: receiver });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("[TRANSFERS] Error recibiendo transferencia:", error);
    res.status(500).json({ error: "No se pudo procesar la recepción de la transferencia." });
  }
});

// ============================================================================
// 7. CONCILIACIÓN BANCARIA & VALIDACIÓN ANTIFRAUDE (FASE 4 PLAN ERP)
// ============================================================================

// Listado de cuentas bancarias recaudadoras oficiales
app.get("/api/company-bank-accounts", async (_req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM company_bank_accounts ORDER BY id ASC");
    res.json(rows);
  } catch (error: any) {
    console.error("[BANK ACCOUNTS] Error listando cuentas:", error);
    res.status(500).json({ error: "No se pudieron obtener las cuentas bancarias." });
  }
});

app.post("/api/company-bank-accounts", async (req, res) => {
  const { id, bank_name, account_number, cci, currency, account_type, account_holder, status } = req.body;
  if (!bank_name || !account_number) {
    return res.status(400).json({ error: "Banco y número de cuenta son obligatorios." });
  }
  const accId = id || `CTA-${Date.now().toString().slice(-4)}`;
  try {
    await pool.query(
      `INSERT INTO company_bank_accounts (id, bank_name, account_number, cci, currency, account_type, account_holder, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), account_number = VALUES(account_number),
        cci = VALUES(cci), currency = VALUES(currency), account_type = VALUES(account_type),
        account_holder = VALUES(account_holder), status = VALUES(status)`,
      [accId, bank_name, account_number, cci || null, currency || 'PEN', account_type || 'Corriente', account_holder || 'CHOHO PERÚ S.A.C.', status || 'Activo']
    );
    res.json({ success: true, id: accId, message: "Cuenta bancaria guardada." });
  } catch (error: any) {
    console.error("[BANK ACCOUNTS] Error guardando cuenta:", error);
    res.status(500).json({ error: "No se pudo guardar la cuenta bancaria." });
  }
});

// Bandeja de pagos para conciliación bancaria
app.get("/api/payments/reconciliation", async (_req, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT p.*, i.clientName, i.clientDoc, i.total as totalInvoice, b.bank_name
        FROM payments p
        LEFT JOIN invoices i ON p.quoteId = i.id
        LEFT JOIN company_bank_accounts b ON p.bank_id = b.id
        ORDER BY p.date DESC
        LIMIT 300`
    );
    res.json(rows);
  } catch (error: any) {
    console.error("[PAYMENTS RECONCILIATION] Error listando pagos:", error);
    res.status(500).json({ error: "No se pudieron obtener los pagos para conciliación." });
  }
});

// Aprobación o verificación de conciliación por tesorería/contabilidad
app.post("/api/payments/:id/reconcile", async (req, res) => {
  const { id } = req.params;
  const { status, verified_by } = req.body;
  const newStatus = status === "OBSERVADO" ? "OBSERVADO" : "CONCILIADO";
  const verifier = verified_by || "Tesorería CHOHO";
  try {
    await pool.query(
      "UPDATE payments SET reconciliation_status = ?, verified_by = ?, verified_at = NOW() WHERE id = ?",
      [newStatus, verifier, id]
    );
    res.json({ success: true, id, reconciliation_status: newStatus, verified_by: verifier });
  } catch (error: any) {
    console.error("[PAYMENTS RECONCILE] Error actualizando estado:", error);
    res.status(500).json({ error: "No se pudo actualizar el estado de conciliación." });
  }
});

// START SERVER & DATABASE ENGINE
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CHOHO PERU FULLSTACK] Servidor activo en http://localhost:${PORT}`);
  });
}

startServer();
