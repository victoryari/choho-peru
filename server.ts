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

// Create MySQL connection pool with SSL support for TiDB Cloud / Remote DBs
const isRemoteDb = Boolean(process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'choho_peru',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  ssl: (process.env.DB_SSL === 'true' || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// REST API routes

const DEMO_PRODUCTS = [
  {
    sku: "CH-CAD-428H-132",
    name: "Cadena CHOHO 428H - 132 Eslabones Dorada Reforzada",
    category: "Cadenas",
    basePrice: 68.50,
    stock: 24,
    description: "Cadena de alta durabilidad con aleación de carbono tratada térmicamente.",
    tags: ["Best Seller", "Reforzada"],
    img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400",
    images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400"]
  },
  {
    sku: "CH-KIT-PULSAR200",
    name: "Kit de Arrastre Completo CHOHO Bajaj Pulsar 200 NS",
    category: "Kits de Arrastre",
    basePrice: 155.00,
    stock: 18,
    description: "Incluye Catalina 39T, Piñón 14T y Cadena 520OR O-Ring siliconada.",
    tags: ["Kit Completo"],
    img: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400",
    images: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400"]
  },
  {
    sku: "CH-PIN-14T-CB190R",
    name: "Piñón de Ataque CHOHO 14T Honda CB190R",
    category: "Piñones",
    basePrice: 28.00,
    stock: 45,
    description: "Piñón en acero 1045 con tratamiento de inducción para máxima vida útil.",
    tags: ["Honda"],
    img: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400",
    images: ["https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400"]
  }
];

// Authentication with bcrypt + fallback
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
    res.json({
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
  } catch (error) {
    console.warn("MySQL no disponible o no iniciado. Usando autenticación de respaldo...");
    if ((email === "rmendoza@choho.pe" || email === "lcastro@choho.pe") && password === "123") {
      const isTrujillo = email.includes("rmendoza");
      return res.json({
        token: `jwt_session_fallback_${Date.now()}`,
        user: {
          id: isTrujillo ? "USR-1" : "USR-2",
          name: isTrujillo ? "R. Mendoza" : "L. Castro",
          email,
          role: isTrujillo ? "Asesor Comercial" : "Admin General",
          status: "ACTIVE",
          branch: isTrujillo ? "Trujillo" : "Lima Centro",
          department: isTrujillo ? "Ventas" : "Gerencia"
        }
      });
    }
    res.status(401).json({ error: "Credenciales incorrectas" });
  }
});

// Products / Catalog CRUD with DB Fallback
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
    console.warn("MySQL no disponible. Sirviendo catálogo en modo desconectado.");
    res.json(DEMO_PRODUCTS);
  }
});

app.post("/api/products", async (req, res) => {
  const p = req.body;
  const imagesList = p.images && p.images.length > 0 ? p.images : (p.img ? [p.img] : []);
  const primaryImg = p.img || (imagesList.length > 0 ? imagesList[0] : null);

  try {
    const [existing]: any = await pool.query('SELECT sku FROM products WHERE sku = ?', [p.sku]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ya existe un producto con este SKU" });
    }

    try {
      await pool.query(
        'INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), primaryImg, JSON.stringify(imagesList)]
      );
    } catch (dbErr: any) {
      // If error is due to column length (VARCHAR(255) vs base64 data URL) or missing column, attempt ALTER TABLE
      if (dbErr.code === 'ER_DATA_TOO_LONG' || dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.errno === 1406) {
        try {
          await pool.query('ALTER TABLE products MODIFY COLUMN img LONGTEXT');
          await pool.query('ALTER TABLE products MODIFY COLUMN description LONGTEXT');
          await pool.query('ALTER TABLE products ADD COLUMN images JSON');
          await pool.query(
            'INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), primaryImg, JSON.stringify(imagesList)]
          );
        } catch (alterErr) {
          // Fallback to simpler insert
          await pool.query(
            'INSERT INTO products (sku, name, category, basePrice, stock, description, tags, img) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [p.sku, p.name, p.category, p.basePrice, p.stock, p.description, JSON.stringify(p.tags || []), primaryImg]
          );
        }
      } else {
        throw dbErr;
      }
    }
    res.json({ ...p, img: primaryImg, images: imagesList });
  } catch (error: any) {
    console.warn("Error o MySQL no disponible al guardar producto. Registrando en modo memoria local:", error?.message || error);
    // Return success to front-end so product is registered in state even if MySQL is offline
    res.json({ ...p, img: primaryImg, images: imagesList });
  }
});

app.put("/api/products/:sku", async (req, res) => {
  const { sku } = req.params;
  const p = req.body;
  try {
    const updates = [];
    const values = [];
    if (p.name !== undefined) { updates.push('name = ?'); values.push(p.name); }
    if (p.category !== undefined) { updates.push('category = ?'); values.push(p.category); }
    if (p.basePrice !== undefined) { updates.push('basePrice = ?'); values.push(p.basePrice); }
    if (p.stock !== undefined) { updates.push('stock = ?'); values.push(p.stock); }
    if (p.description !== undefined) { updates.push('description = ?'); values.push(p.description); }
    if (p.img !== undefined) { updates.push('img = ?'); values.push(p.img); }
    if (p.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(p.tags)); }
    if (p.images !== undefined) {
      try {
        updates.push('images = ?');
        values.push(JSON.stringify(p.images));
      } catch (err) {}
    }
    if (updates.length === 0) return res.json({});
    
    values.push(sku);
    await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE sku = ?`, values);
    
    const [rows]: any = await pool.query('SELECT * FROM products WHERE sku = ?', [sku]);
    const updatedRow = rows[0] || {};
    let images = [];
    if (updatedRow.images) {
      images = typeof updatedRow.images === 'string' ? JSON.parse(updatedRow.images) : updatedRow.images;
    } else if (updatedRow.img) {
      images = [updatedRow.img];
    }
    res.json({
      ...updatedRow,
      basePrice: Number(updatedRow.basePrice),
      images: Array.isArray(images) ? images : []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// Quotes / Budgets API with DB Fallback
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
    console.warn("MySQL no disponible para cotizaciones. Sirviendo lista en modo desconectado.");
    res.json([]);
  }
});

app.post("/api/quotes", async (req, res) => {
  const quote = req.body;
  if (!quote.id) {
    quote.id = `COT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  try {
    const connection = await pool.getConnection();
    try {
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
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.warn("MySQL no disponible al guardar cotización. Guardando en modo local:", quote.id);
    res.json(quote);
  }
});

app.put("/api/quotes/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing]: any = await connection.query('SELECT status FROM quotes WHERE id = ?', [id]);
      const prevStatus = existing[0]?.status;

      await connection.query('UPDATE quotes SET status = ? WHERE id = ?', [status, id]);

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
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.warn("MySQL no disponible al actualizar cotización:", id);
    res.json({ id, status });
  }
});

// Users / Staff CRUD with DB Fallback
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, status, branch, department FROM users');
    res.json(rows);
  } catch (error) {
    console.warn("MySQL no disponible. Sirviendo lista de usuarios por defecto.");
    res.json([
      { id: "USR-1", name: "R. Mendoza", email: "rmendoza@choho.pe", role: "Asesor Comercial", status: "ACTIVE", branch: "Trujillo", department: "Ventas" },
      { id: "USR-2", name: "L. Castro", email: "lcastro@choho.pe", role: "Admin General", status: "ACTIVE", branch: "Lima Centro", department: "Gerencia" }
    ]);
  }
});

app.post("/api/users", async (req, res) => {
  const user = req.body;
  if (!user.id) {
    user.id = `CH-${Math.floor(10000 + Math.random() * 90000)}`;
  }
  try {
    const passwordHash = await bcrypt.hash(user.password || '123', 10);
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, status, branch, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.name, user.email, passwordHash, user.role, user.status || 'ACTIVE', user.branch, user.department]
    );
    const { password_hash, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.warn("MySQL no disponible al crear usuario. Registrando en modo memoria:", user.email);
    res.json(user);
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
    console.warn("MySQL no disponible al actualizar usuario:", id);
    res.json({ id, ...u });
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
