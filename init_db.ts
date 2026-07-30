import mysql from 'mysql2/promise';
import fs from 'fs';
import bcrypt from 'bcrypt';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function initDB() {
  const isRemoteDb = Boolean(process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'choho_peru',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    ssl: (process.env.DB_SSL === 'true' || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true
  });

  try {
    console.log('Creando estructura de tablas (schema.sql)...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
    await connection.query(schemaSql);

    console.log('Creando usuarios por defecto con contraseñas encriptadas...');
    const passwordHash = await bcrypt.hash('123', 10);
    
    await connection.query(`
      INSERT IGNORE INTO users (id, name, email, password_hash, role, status, branch, department) VALUES 
      ('USR-1', 'R. Mendoza', 'rmendoza@choho.pe', ?, 'Asesor Comercial', 'ACTIVE', 'Trujillo', 'Ventas'),
      ('USR-2', 'L. Castro', 'lcastro@choho.pe', ?, 'Admin General', 'ACTIVE', 'Lima Centro', 'Gerencia')
    `, [passwordHash, passwordHash]);

    console.log('Insertando catálogo inicial de productos CHOHO...');
    await connection.query(`
      INSERT IGNORE INTO products (sku, name, category, basePrice, stock, description, tags, img, images) VALUES
      ('CH-CAD-428H-132', 'Cadena CHOHO 428H - 132 Eslabones Dorada Reforzada', 'Cadenas', 68.50, 24, 'Cadena de alta durabilidad con aleación de carbono tratada térmicamente.', '["Best Seller", "Reforzada"]', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400', '["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400"]'),
      ('CH-KIT-PULSAR200', 'Kit de Arrastre Completo CHOHO Bajaj Pulsar 200 NS', 'Kits de Arrastre', 155.00, 18, 'Incluye Catalina 39T, Piñón 14T y Cadena 520OR O-Ring siliconada.', '["Kit Completo"]', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400', '["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400"]'),
      ('CH-PIN-14T-CB190R', 'Piñón de Ataque CHOHO 14T Honda CB190R', 'Piñones', 28.00, 45, 'Piñón en acero 1045 con tratamiento de inducción para máxima vida útil.', '["Honda"]', 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400', '["https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400"]')
    `);

    console.log('¡Base de datos CHOHO PERÚ inicializada correctamente!');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    await connection.end();
  }
}

initDB();
