import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'choho_peru',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// REST API routes

// Authentication with bcrypt
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    const user = rows[0];
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Usuario suspendido o inactivo" });
    }
    
    const token = `jwt_session_${user.id}_${Date.now()}`;
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      branch: user.branch,
      department: user.department
    };
    res.json({ token, user: userResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error de servidor al iniciar sesión" });
  }
});

// Products / Catalog CRUD
app.get("/api/products", async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM products');
    const parsedRows = rows.map((p: any) => {
      let images = [];
      if (p.images) {
        images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
      } else if (p.img) {
        images = [p.img];
      }
      return {
        ...p,
        basePrice: Number(p.basePrice),
        images: Array.isArray(images) ? images : []
      };
    });
    res.json(parsedRows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

app.post("/api/products", async (req, res) => {
  const p = req.body;
  try {
    const [existing]: any = await pool.query('SELECT sku FROM products WHERE sku = ?', [p.sku]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Ya existe un producto con este SKU" });
    }
    const imagesList = p.images && p.images.length > 0 ? p.images : (p.img ? [p.img] : []);
    const primaryImg = p.img || (imagesList.length > 0 ? imagesList[0] : null);

    try {
      await pool.query(
        'INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), primaryImg, JSON.stringify(imagesList)]
      );
    } catch (colErr) {
      // Fallback if images column doesn't exist yet
      await pool.query(
        'INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), primaryImg]
      );
    }
    res.json({ ...p, img: primaryImg, images: imagesList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar el producto" });
  }
});

app.put("/api/products/:sku", async (req, res) => {
  const { sku } = req.params;
  const p = req.body;
  try {
    // Solo actualizaremos los campos que llegan (stock, basePrice, etc)
    const updates = [];
    const values = [];
    if (p.stock !== undefined) { updates.push('stock = ?'); values.push(p.stock); }
    if (p.basePrice !== undefined) { updates.push('basePrice = ?'); values.push(p.basePrice); }
    if (p.name !== undefined) { updates.push('name = ?'); values.push(p.name); }
    if (updates.length === 0) return res.json({});
    
    values.push(sku);
    await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE sku = ?`, values);
    
    const [rows]: any = await pool.query('SELECT * FROM products WHERE sku = ?', [sku]);
    res.json(rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// Quotes / Budgets API
app.get("/api/quotes", async (req, res) => {
  try {
    const [quotes]: any = await pool.query('SELECT * FROM quotes ORDER BY date DESC');
    const [items]: any = await pool.query('SELECT * FROM quote_items');
    
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
    res.json(formattedQuotes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener cotizaciones" });
  }
});

app.post("/api/quotes", async (req, res) => {
  const quote = req.body;
  const connection = await pool.getConnection();
  try {
    if (!quote.id) {
      quote.id = `COT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    }
    await connection.beginTransaction();
    
    await connection.query(
      'INSERT INTO quotes (id, clientName, clientDoc, advisor, total, subtotal, igv, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [quote.id, quote.clientName, quote.clientDoc, quote.advisor, quote.total, quote.subtotal, quote.igv, quote.date, quote.status]
    );
    
    for (const item of quote.items) {
      await connection.query(
        'INSERT INTO quote_items (quote_id, sku, name, qty, price) VALUES (?, ?, ?, ?, ?)',
        [quote.id, item.sku, item.name, item.qty, item.price]
      );
    }
    
    await connection.commit();
    res.json(quote);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Error al crear cotización" });
  } finally {
    connection.release();
  }
});

app.put("/api/quotes/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check previous status
    const [existing]: any = await connection.query('SELECT status FROM quotes WHERE id = ?', [id]);
    const prevStatus = existing[0]?.status;

    await connection.query('UPDATE quotes SET status = ? WHERE id = ?', [status, id]);

    // If changing to Aceptada, automatically deduct stock
    if (status === 'Aceptada' && prevStatus !== 'Aceptada') {
      const [items]: any = await connection.query('SELECT sku, qty FROM quote_items WHERE quote_id = ?', [id]);
      for (const item of items) {
        await connection.query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE sku = ?', [item.qty, item.sku]);
      }
    }

    await connection.commit();
    res.json({ id, status });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Error al actualizar cotización" });
  } finally {
    connection.release();
  }
});

// Users / Staff CRUD
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, status, branch, department FROM users');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.post("/api/users", async (req, res) => {
  const user = req.body;
  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [user.email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }
    
    if (!user.id) {
      user.id = `CH-${Math.floor(10000 + Math.random() * 90000)}`;
    }
    
    // Por defecto se le asigna "123" y se fuerza a cambiar luego (o se le pide)
    const passwordHash = await bcrypt.hash(user.password || '123', 10);
    
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, status, branch, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.name, user.email, passwordHash, user.role, user.status || 'ACTIVE', user.branch, user.department]
    );
    
    const { password_hash, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const updates = [];
    const values = [];
    
    if (u.name) { updates.push('name = ?'); values.push(u.name); }
    if (u.role) { updates.push('role = ?'); values.push(u.role); }
    if (u.status) { updates.push('status = ?'); values.push(u.status); }
    
    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    
    res.json({ id, ...u });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Telemetry & Route API
app.get("/api/telemetry", async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM telemetry ORDER BY time DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener telemetría" });
  }
});

// Sync data automatically between devices
app.post("/api/sync", async (req, res) => {
  const { localQuotes, localProducts } = req.body;
  let syncCount = 0;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (Array.isArray(localQuotes)) {
      for (const quote of localQuotes) {
        const [existing]: any = await connection.query('SELECT id FROM quotes WHERE id = ?', [quote.id]);
        if (existing.length === 0) {
          await connection.query(
            'INSERT INTO quotes (id, clientName, clientDoc, advisor, total, subtotal, igv, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [quote.id, quote.clientName, quote.clientDoc, quote.advisor, quote.total, quote.subtotal, quote.igv, quote.date, quote.status]
          );
          for (const item of quote.items) {
            await connection.query(
              'INSERT INTO quote_items (quote_id, sku, name, qty, price) VALUES (?, ?, ?, ?, ?)',
              [quote.id, item.sku, item.name, item.qty, item.price]
            );
          }
          syncCount++;
        }
      }
    }

    if (Array.isArray(localProducts)) {
      for (const p of localProducts) {
        await connection.query(
          `INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE stock = ?, basePrice = ?`,
          [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), p.img || null, p.stock, p.basePrice]
        );
      }
    }

    await connection.commit();
    
    // Obtener BD actualizada para devolverla
    const [quotes]: any = await pool.query('SELECT * FROM quotes ORDER BY date DESC');
    const [items]: any = await pool.query('SELECT * FROM quote_items');
    const formattedQuotes = quotes.map((q: any) => ({
      ...q,
      items: items.filter((i: any) => i.quote_id === q.id).map((i: any) => ({
        sku: i.sku, name: i.name, qty: i.qty, price: i.price
      }))
    }));
    
    res.json({ status: "success", syncCount, db: { quotes: formattedQuotes } });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Error en la sincronización" });
  } finally {
    connection.release();
  }
});

// SUNAT / RENIEC Simulation mock service
app.get("/api/sunat/:ruc", (req, res) => {
  const { ruc } = req.params;
  const cleanRuc = ruc ? ruc.trim() : "";
  
  if (!/^\d{11}$/.test(cleanRuc)) {
    return res.status(400).json({ error: "El RUC debe ser un número de 11 dígitos" });
  }

  const validPrefixes = ["10", "15", "17", "20"];
  if (!validPrefixes.some(p => cleanRuc.startsWith(p))) {
    return res.status(400).json({ error: "El RUC debe comenzar con 10, 15, 17 o 20" });
  }

  const sampleBusinessNames: { [key: string]: string } = {
    "20608542193": "Moto Repuestos Lima S.A.C.",
    "20124567891": "Distribuidora Norte E.I.R.L.",
    "20448123956": "Repuestos Minería del Sur S.A.",
    "20556123490": "Logística Transandina EIRL",
    "20993812543": "AgroIndustrias El Olivar S.A.C.",
    "10458920123": "Juan Carlos Paredes (Persona Natural RUC)"
  };

  const businessName = sampleBusinessNames[cleanRuc] || `Importaciones y Repuestos ${cleanRuc.substring(6)} S.A.C.`;
  res.json({ 
    ruc: cleanRuc, 
    businessName, 
    address: "Av. Industrial 452, Cercado de Lima", 
    condition: "ACTIVO", 
    state: "HABIDO" 
  });
});

// Start the server
async function startServer() {
  // If Vite development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CHOHO PERU SERVER] running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
