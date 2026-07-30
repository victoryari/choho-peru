CREATE DATABASE IF NOT EXISTS choho_peru;
USE choho_peru;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  branch VARCHAR(100),
  department VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS products (
  sku VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  basePrice DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  description LONGTEXT,
  tags JSON,
  img LONGTEXT,
  images JSON
);

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(50) PRIMARY KEY,
  clientName VARCHAR(150) NOT NULL,
  clientDoc VARCHAR(20) NOT NULL,
  advisor VARCHAR(100) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  status ENUM('Pendiente', 'Aceptada', 'Rechazada') DEFAULT 'Pendiente'
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  qty INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS telemetry (
  id VARCHAR(50) PRIMARY KEY,
  advisor VARCHAR(100) NOT NULL,
  client VARCHAR(150) NOT NULL,
  time DATETIME NOT NULL,
  status ENUM('Visited', 'Pending', 'Offline') NOT NULL,
  quote_id VARCHAR(50) NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

-- Insert default branches
INSERT IGNORE INTO branches (id, name, status) VALUES
('BR-1', 'Sede Trujillo', 'ACTIVE'),
('BR-2', 'Sede Lima', 'ACTIVE'),
('BR-3', 'Sede Lima Centro', 'ACTIVE'),
('BR-4', 'Sede Arequipa', 'ACTIVE');

-- Insert default departments
INSERT IGNORE INTO departments (id, name, status) VALUES
('DEP-1', 'Ventas', 'ACTIVE'),
('DEP-2', 'Facturación', 'ACTIVE'),
('DEP-3', 'Almacén', 'ACTIVE'),
('DEP-4', 'Gerencia', 'ACTIVE'),
('DEP-5', 'Marketing', 'ACTIVE');

-- Insert demo products
INSERT IGNORE INTO products (sku, name, category, basePrice, stock, description, tags, img) VALUES
('CAT-SPROCKET-001', 'Catalina 45T Acero Templado', 'Transmisión', 125.50, 45, 'Catalina de alta resistencia para uso extremo', '["enduro", "cross"]', NULL),
('CH-CHAIN-520', 'Cadena 520H Reforzada O-Ring', 'Transmisión', 85.00, 120, 'Cadena sellada O-Ring dorada', '["calle", "dorada"]', NULL),
('BRK-PAD-F01', 'Pastillas de Freno Sinterizadas', 'Frenos', 45.00, 200, 'Pastillas delanteras cerámicas', '["scooter", "friccion"]', NULL);

-- Las contraseñas (123) serán insertadas mediante un script de inicialización o migradas directamente
