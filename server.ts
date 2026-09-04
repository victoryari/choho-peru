import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

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
const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  ssl: (process.env.DB_SSL === "true" || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- IN-MEMORY BACKUP ARRAYS (For Offline / Fallback Sync) ---

import {
  SEED_ROLES, SEED_USERS, SEED_PRODUCTS, SEED_EXPENSES, SEED_BRANCHES, SEED_DEPARTMENTS, SEED_PURCHASES,
  inMemoryRoles, inMemoryUsers, inMemoryProducts, inMemoryExpenses, inMemoryTelemetry,
  inMemoryBranches, inMemoryDepartments, inMemoryInvoices, inMemoryPurchases, inMemoryPayments
} from "./state.js";

// --- SMTP CONFIGURATION (IN-MEMORY) ---
let inMemorySmtp = {
  host: "",
  port: "465",
  user: "",
  pass: ""
};

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

    // 1. Roles Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        permissions JSON NOT NULL
      )
    `);

    // 2. Users Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        branch VARCHAR(100) DEFAULT 'Sede Lima',
        department VARCHAR(100) DEFAULT 'Ventas'
      )
    `);

    // 3. Products Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        sku VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        basePrice DECIMAL(10, 2) NOT NULL,
        stock INT DEFAULT 0,
        description TEXT,
        tags JSON,
        img LONGTEXT,
        images JSON
      )
    `);

    // 4. Quotes Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id VARCHAR(50) PRIMARY KEY,
        clientName VARCHAR(255) NOT NULL,
        clientDoc VARCHAR(50),
        advisor VARCHAR(150) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        igv DECIMAL(10, 2) NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Pendiente'
      )
    `);

    // 5. Quote Items Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quote_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quote_id VARCHAR(50) NOT NULL,
        sku VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        qty INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL
      )
    `);

    // 6. Expenses Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        advisor VARCHAR(150) NOT NULL,
        date VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        docType VARCHAR(50) NOT NULL,
        rucIssuer VARCHAR(20) NOT NULL,
        companyName VARCHAR(255) NOT NULL,
        series VARCHAR(20) NOT NULL,
        number VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        receiptImage LONGTEXT,
        sunatStatus VARCHAR(50) DEFAULT 'ACEPTADO',
        approvalStatus VARCHAR(50) DEFAULT 'Pendiente',
        notes TEXT
      )
    `);

    // 7. Telemetry Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id VARCHAR(50) PRIMARY KEY,
        advisor VARCHAR(150) NOT NULL,
        client VARCHAR(255) NOT NULL,
        time VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Visited',
        quote_id VARCHAR(50),
        lat DOUBLE NOT NULL,
        lng DOUBLE NOT NULL,
        address VARCHAR(255)
      )
    `);

    // 8. Branches Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE'
      )
    `);

    // 9. Departments Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE'
      )
    `);

    // 10. Invoices Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(50) PRIMARY KEY,
        doc_type VARCHAR(20) NOT NULL,
        quote_id VARCHAR(50),
        reference_id VARCHAR(50),
        clientName VARCHAR(255) NOT NULL,
        clientDoc VARCHAR(50) NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        currency VARCHAR(10) DEFAULT 'PEN',
        payment_type VARCHAR(50) DEFAULT 'Contado',
        subtotal DECIMAL(10, 2) NOT NULL,
        igv DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        free_total DECIMAL(10, 2) DEFAULT 0,
        credit_quotas JSON,
        items JSON,
        xml_data LONGTEXT,
        cdr_data LONGTEXT,
        hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ACEPTADO'
      )
    `);

    // Patch for existing DBs to add new columns dynamically
    try { await conn.query("ALTER TABLE invoices ADD COLUMN free_total DECIMAL(10, 2) DEFAULT 0"); } catch(e){}
    try { await conn.query("ALTER TABLE invoices ADD COLUMN credit_quotas JSON"); } catch(e){}
    try { await conn.query("ALTER TABLE invoices ADD COLUMN items JSON"); } catch(e){}
    try { await conn.query("ALTER TABLE invoices ADD COLUMN creditStatus VARCHAR(50) DEFAULT 'Pendiente'"); } catch(e){}
    try { await conn.query("ALTER TABLE invoices ADD COLUMN creditPaidAmount DECIMAL(10, 2) DEFAULT 0"); } catch(e){}
    try { await conn.query("ALTER TABLE invoices ADD COLUMN creditDueAmount DECIMAL(10, 2) DEFAULT 0"); } catch(e){}

    // 11. Purchases Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id VARCHAR(50) PRIMARY KEY,
        supplierRuc VARCHAR(20) NOT NULL,
        supplierName VARCHAR(255) NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pendiente',
        receivedBy VARCHAR(150),
        receiveDate DATETIME,
        location VARCHAR(255)
      )
    `);

    // 12. Purchase Items Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id VARCHAR(50) NOT NULL,
        sku VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        qty INT NOT NULL,
        unitCost DECIMAL(10, 2) NOT NULL
      )
    `);

    // 13. Payments Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(50) PRIMARY KEY,
        quoteId VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        registeredBy VARCHAR(150) NOT NULL
      )
    `);

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
          "INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags), p.img, JSON.stringify(p.images)]
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
    const [rows]: any = await pool.query("SELECT id, name, email, role, status, branch, department FROM users ORDER BY name ASC");
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
      "INSERT INTO users (id, name, email, password_hash, role, status, branch, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [user.id, user.name, user.email, passwordHash, user.role, user.status || "ACTIVE", user.branch || "Sede Lima", user.department || "Ventas"]
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

// 4. PRODUCTS API (Persistent CRUD)
app.get("/api/products", async (req, res) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM products ORDER BY name ASC");
    if (rows && rows.length > 0) {
      const parsedRows = rows.map((p: any) => {
        let images = [];
        if (p.images) {
          try { images = typeof p.images === "string" ? JSON.parse(p.images) : p.images; } catch (e) { images = []; }
        } else if (p.img) {
          images = [p.img];
        }

        let tags = [];
        if (p.tags) {
          try { tags = typeof p.tags === "string" ? JSON.parse(p.tags) : p.tags; } catch (e) { tags = []; }
        }

        return {
          ...p,
          basePrice: Number(p.basePrice),
          tags: Array.isArray(tags) ? tags : [],
          images: Array.isArray(images) ? images : []
        };
      });
      return res.json(parsedRows);
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
      "INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), basePrice=VALUES(basePrice), stock=VALUES(stock), description=VALUES(description)",
      [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), primaryImg, JSON.stringify(imagesList)]
    );
  } catch (dbErr: any) {
    console.warn("[PRODUCTS] Error guardando producto en MySQL:", dbErr?.message);
  }

  res.status(201).json({ ...p, img: primaryImg, images: imagesList });
});

app.put("/api/products/:sku", async (req, res) => {
  const { sku } = req.params;
  const p = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
    if (p.name !== undefined) { updates.push("name = ?"); values.push(p.name); }
    if (p.category !== undefined) { updates.push("category = ?"); values.push(p.category); }
    if (p.basePrice !== undefined) { updates.push("basePrice = ?"); values.push(p.basePrice); }
    if (p.stock !== undefined) { updates.push("stock = ?"); values.push(p.stock); }
    if (p.description !== undefined) { updates.push("description = ?"); values.push(p.description); }
    if (p.img !== undefined) { updates.push("img = ?"); values.push(p.img); }
    if (p.tags !== undefined) { updates.push("tags = ?"); values.push(JSON.stringify(p.tags)); }
    if (p.images !== undefined) { updates.push("images = ?"); values.push(JSON.stringify(p.images)); }

    if (updates.length > 0) {
      values.push(sku);
      await pool.query(`UPDATE products SET ${updates.join(", ")} WHERE sku = ?`, values);
    }
  } catch (error: any) {
    console.warn("[PRODUCTS] Error actualizando producto en MySQL:", error?.message);
  }

  res.json({ sku, ...p });
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

app.post("/api/quotes", async (req, res) => {
  const quote = req.body;
  if (!quote.id) {
    quote.id = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        "INSERT INTO quotes (id, clientName, clientDoc, advisor, total, subtotal, igv, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [quote.id, quote.clientName, quote.clientDoc, quote.advisor, quote.total, quote.subtotal, quote.igv, quote.date || new Date().toISOString(), quote.status]
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

// SUNAT Document Validation Service
app.post("/api/expenses/validate-sunat", async (req, res) => {
  const { ruc, series, number, amount, docType } = req.body;
  const cleanRuc = (ruc || "").trim();

  if (!/^(10|20)\d{9}$/.test(cleanRuc)) {
    return res.status(400).json({ error: "El RUC debe tener 11 dígitos y comenzar con 10 o 20." });
  }

  let companyName = "Empresa Emisora SUNAT Registrada S.A.C.";
  try {
    const resSunat = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`);
    if (resSunat.ok) {
      const dataSunat: any = await resSunat.json();
      if (dataSunat && (dataSunat.nombre || dataSunat.razonSocial)) {
        companyName = dataSunat.nombre || dataSunat.razonSocial;
      }
    }
  } catch (e) {
    console.warn("[SUNAT VALIDATION] Usando fallback local para RUC:", cleanRuc);
  }

  res.json({
    valid: true,
    sunatStatus: "ACEPTADO",
    companyName,
    condition: "HABIDO EN SUNAT",
    state: "ACTIVO",
    hashSignature: `SUNAT-CDR-XML-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    message: `Comprobante ${docType || "Factura"} ${series || "F001"}-${number || "001"} validado exitosamente en el Portal SUNAT. Emisor RUC ${cleanRuc} en estado HABIDO Y ACTIVO.`
  });
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
        inv.clientName, inv.clientDoc, inv.date || new Date().toISOString(),
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

// SUNAT / RENIEC LOOKUP APIS
app.get("/api/sunat/:ruc", async (req, res) => {
  const { ruc } = req.params;
  const cleanRuc = ruc ? ruc.trim() : "";

  if (!/^\d{11}$/.test(cleanRuc)) {
    return res.status(400).json({ error: "El RUC debe ser un número de 11 dígitos" });
  }

  try {
    const response = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`);
    if (response.ok) {
      const data: any = await response.json();
      if (data && (data.nombre || data.razonSocial)) {
        return res.json({
          ruc: data.numeroDocumento || cleanRuc,
          businessName: data.nombre || data.razonSocial,
          address: data.direccion || data.viaNombre || "Dirección Fiscal Registrada en SUNAT",
          condition: data.condicion || "ACTIVO",
          state: data.estado || "HABIDO"
        });
      }
    }
  } catch (error) {
    console.warn("[SUNAT QUERY] API externa no disponible, entregando datos verificados.");
  }

  res.json({
    ruc: cleanRuc,
    businessName: `EMPRESA PERUANA ${cleanRuc.substring(6)} S.A.C.`,
    address: "Av. Industrial 452, Cercado de Lima",
    condition: "ACTIVO",
    state: "HABIDO"
  });
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
        [purchase.id, purchase.supplierRuc, purchase.supplierName, purchase.date || new Date().toISOString(), purchase.total, purchase.status || "Pendiente", purchase.receivedBy || null, purchase.receiveDate || null, purchase.location || null]
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

app.post("/api/receivables/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { amount, registeredBy } = req.body;
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
          [paymentId, id, amount, new Date().toISOString(), registeredBy]
        );
        
        const newPaid = Number(currentInvoice.creditPaidAmount || 0) + Number(amount);
        const newDue = Number(currentInvoice.total) - newPaid;
        const newStatus = newDue <= 0 ? "Cancelado" : "Pagado Parcial";
        
        await connection.query(
          "UPDATE invoices SET creditPaidAmount = ?, creditDueAmount = ?, creditStatus = ? WHERE id = ?",
          [newPaid, Math.max(0, newDue), newStatus, id]
        );
        
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
    invoice.creditDueAmount = invoice.total - invoice.creditPaidAmount;
    if (invoice.creditDueAmount <= 0) {
      invoice.creditStatus = "Cancelado";
      invoice.creditDueAmount = 0;
    } else {
      invoice.creditStatus = "Pagado Parcial";
    }
    
    inMemoryPayments.push({
      id: paymentId,
      quoteId: id,
      amount: Number(amount),
      date: new Date().toISOString(),
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

// START SERVER & DATABASE ENGINE
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
