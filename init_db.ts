import mysql from 'mysql2/promise';
import fs from 'fs';
import bcrypt from 'bcrypt';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function initDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('Creando base de datos y tablas...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
    await connection.query(schemaSql);
    
    // Switch to database
    await connection.query('USE choho_peru');

    console.log('Creando usuarios con contraseñas encriptadas...');
    const passwordHash = await bcrypt.hash('123', 10);
    
    await connection.query(`
      INSERT IGNORE INTO users (id, name, email, password_hash, role, status, branch, department) VALUES 
      ('USR-1', 'R. Mendoza', 'rmendoza@choho.pe', ?, 'Asesor Comercial', 'ACTIVE', 'Trujillo', 'Ventas'),
      ('USR-2', 'L. Castro', 'lcastro@choho.pe', ?, 'Admin General', 'ACTIVE', 'Lima Centro', 'Gerencia')
    `, [passwordHash, passwordHash]);
    
    console.log('¡Base de datos inicializada correctamente!');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    await connection.end();
  }
}

initDB();
