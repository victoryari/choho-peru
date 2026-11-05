CREATE DATABASE IF NOT EXISTS choho_peru;
USE choho_peru;

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  branch VARCHAR(100) DEFAULT 'Sede Lima',
  department VARCHAR(100) DEFAULT 'Ventas',
  sales_zone VARCHAR(100) DEFAULT 'Zona - Lima'
);

-- Taxonomia de catalogo: Familia (nivel 1) > Sub-familia (nivel 2) > Linea (nivel 3).
-- Arbol auto-relacionado: parent_id NULL = raiz.
CREATE TABLE IF NOT EXISTS categorias (
  id VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  parentId VARCHAR(50),
  nivel TINYINT NOT NULL DEFAULT 1,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categorias_parent FOREIGN KEY (parentId) REFERENCES categorias(id) ON DELETE RESTRICT
);

-- Los indices e.idx_* se crean en migrate.ts, que es idempotente.

CREATE TABLE IF NOT EXISTS products (
  sku VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  categoriaId VARCHAR(50),
  basePrice DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  description TEXT,
  tags JSON,
  img LONGTEXT,
  images JSON,
  um VARCHAR(20) DEFAULT 'UND',
  codFamilia VARCHAR(50) NULL,
  moneda VARCHAR(10) DEFAULT 'PEN',
  codPrecio VARCHAR(20) NULL,
  tipoPrecio VARCHAR(50) DEFAULT 'PRECIO 1',
  CONSTRAINT fk_products_categoria FOREIGN KEY (categoriaId) REFERENCES categorias(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(50) PRIMARY KEY,
  clientName VARCHAR(255) NOT NULL,
  clientDoc VARCHAR(50),
  clientPhone VARCHAR(50),
  clientAddress TEXT,
  paymentType VARCHAR(50) DEFAULT 'Contado',
  validityDays INT DEFAULT 15,
  advisor VARCHAR(150) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Pendiente'
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  qty INT NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

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
  amount DECIMAL(10,2) NOT NULL,
  receiptImage LONGTEXT,
  sunatStatus VARCHAR(50) DEFAULT 'ACEPTADO',
  approvalStatus VARCHAR(50) DEFAULT 'Pendiente',
  notes TEXT
);

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
);

CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

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
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  free_total DECIMAL(10,2) DEFAULT 0,
  credit_quotas JSON,
  items JSON,
  xml_data LONGTEXT,
  cdr_data LONGTEXT,
  hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACEPTADO',
  creditStatus VARCHAR(50) DEFAULT 'Pendiente',
  creditPaidAmount DECIMAL(10,2) DEFAULT 0,
  creditDueAmount DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR(50) PRIMARY KEY,
  supplierRuc VARCHAR(20) NOT NULL,
  supplierName VARCHAR(255) NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pendiente',
  receivedBy VARCHAR(150),
  receiveDate DATETIME,
  location VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  qty INT NOT NULL,
  unitCost DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) PRIMARY KEY,
  quoteId VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  registeredBy VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS commissions (
  id VARCHAR(50) PRIMARY KEY,
  seller VARCHAR(150) NOT NULL,
  zone VARCHAR(100) NOT NULL,
  salesTotal DECIMAL(10,2) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  month VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pendiente',
  calculationType VARCHAR(100),
  condition_name VARCHAR(100),
  product_category VARCHAR(100),
  is_diferenciada TINYINT(1) DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reglas de descuento administrables.
-- scope discrimina el tipo de regla:
--   PRODUCTO      ->Discount por SKU puntual
--   CATEGORIA     -> Descuento por Familia / Sub-familia / Linea (categoriaId)
--   ESCALA_MONTO  -> Escala por monto de la linea (minAmount/maxAmount delimitan el rango)
--   SUBSIDIO_FLETE-> Subsidio de flete por region, se suma al descuento
-- discountType define la semantica del valor:
--   PORCENTAJE    -> discountCash/discountCredit son porcentajes (0-100)
--   MONTO_FIJO    -> discountCash/discountCredit son soles por UNIDAD
--   PRECIO_ESPECIAL -> priceOfferCash/priceOfferCredit son el precio unitario final y
--                       reemplazan al porcentaje
CREATE TABLE IF NOT EXISTS discount_rules (
  id VARCHAR(50) PRIMARY KEY,
  scope VARCHAR(30) DEFAULT 'PRODUCTO',
  role VARCHAR(100),
  sku VARCHAR(50),
  productName VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  categoriaId VARCHAR(50),
  region VARCHAR(30),
  maxDiscount DECIMAL(5,2),
  minAmount DECIMAL(10,2),
  maxAmount DECIMAL(10,2),
  minQty INT,
  discountCash DECIMAL(10,2),
  discountCredit DECIMAL(10,2),
  priceOfferCash DECIMAL(10,2),
  priceOfferCredit DECIMAL(10,2),
  discountType VARCHAR(50) DEFAULT 'PORCENTAJE',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Activo'
);

CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  assigned_amount DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
  responsible VARCHAR(150) DEFAULT 'Administración General',
  status VARCHAR(20) DEFAULT 'Activo',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petty_cash_expenses (
  id VARCHAR(50) PRIMARY KEY,
  fund_id VARCHAR(50),
  responsible VARCHAR(150) NOT NULL,
  date VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  docType VARCHAR(50) NOT NULL,
  rucIssuer VARCHAR(20) NOT NULL,
  companyName VARCHAR(255) NOT NULL,
  series VARCHAR(20) NOT NULL,
  number VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'PEN',
  receiptImage LONGTEXT,
  xmlFileName VARCHAR(255),
  sunatStatus VARCHAR(50) DEFAULT 'ACEPTADO',
  sunatCondition VARCHAR(50) DEFAULT 'HABIDO',
  sunatState VARCHAR(50) DEFAULT 'ACTIVO',
  approvalStatus VARCHAR(50) DEFAULT 'Aprobado',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  companyName VARCHAR(255) NOT NULL,
  tradeName VARCHAR(255),
  ruc VARCHAR(50) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(150),
  billingEmail VARCHAR(150),
  website VARCHAR(150),
  slogan VARCHAR(255),
  logoUrl LONGTEXT,
  igvPercent DECIMAL(5,2) DEFAULT 18.00,
  exchangeRate DECIMAL(6,3) DEFAULT 3.750,
  defaultCurrency VARCHAR(10) DEFAULT 'PEN',
  defaultValidityDays INT DEFAULT 15,
  bankAccounts JSON,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- --- Fase 1 & 2: Picking & Empaque, Guías de Remisión ---
CREATE TABLE IF NOT EXISTS picking_orders (
  id VARCHAR(50) PRIMARY KEY,
  quote_id VARCHAR(50),
  invoice_id VARCHAR(50),
  client_name VARCHAR(255),
  branch VARCHAR(100) NOT NULL DEFAULT 'Sede Lima',
  operator VARCHAR(150),
  status VARCHAR(30) DEFAULT 'PENDIENTE',
  total_packages INT DEFAULT 1,
  total_weight_kg DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS picking_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  picking_id VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  ordered_qty INT NOT NULL,
  picked_qty INT DEFAULT 0,
  package_no INT DEFAULT 1,
  is_verified TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_picking_items_order FOREIGN KEY (picking_id) REFERENCES picking_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shipping_guides (
  id VARCHAR(50) PRIMARY KEY,
  picking_id VARCHAR(50),
  quote_id VARCHAR(50),
  invoice_id VARCHAR(50),
  issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  transfer_date DATE NOT NULL,
  transport_mode VARCHAR(20) NOT NULL,
  transfer_reason VARCHAR(10) NOT NULL DEFAULT '01',
  receiver_doc_type VARCHAR(10),
  receiver_doc VARCHAR(20),
  receiver_name VARCHAR(255),
  carrier_ruc VARCHAR(20),
  carrier_name VARCHAR(255),
  driver_doc_type VARCHAR(10),
  driver_doc_number VARCHAR(20),
  driver_name VARCHAR(150),
  driver_license VARCHAR(30),
  vehicle_plate VARCHAR(20),
  origin_ubigeo VARCHAR(10) NOT NULL,
  origin_address VARCHAR(255) NOT NULL,
  destination_ubigeo VARCHAR(10) NOT NULL,
  destination_address VARCHAR(255) NOT NULL,
  total_weight_kg DECIMAL(10,2) NOT NULL,
  packages_count INT NOT NULL,
  items JSON,
  sunat_status VARCHAR(30) DEFAULT 'PENDIENTE_ENVIO',
  hash VARCHAR(255),
  xml_data LONGTEXT,
  cdr_data LONGTEXT,
  created_by VARCHAR(150)
);

-- --- Fase 3: Kárdex Físico Multisede & Transferencias Internas ---
CREATE TABLE IF NOT EXISTS branch_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT DEFAULT 5,
  location_rack VARCHAR(50),
  UNIQUE KEY uk_branch_sku (branch_name, sku),
  INDEX idx_branch_stock_sku (sku),
  INDEX idx_branch_stock_branch (branch_name)
);

CREATE TABLE IF NOT EXISTS kardex_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  document_reference VARCHAR(100),
  initial_stock INT NOT NULL,
  quantity INT NOT NULL,
  final_stock INT NOT NULL,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  operator VARCHAR(150) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kardex_sku (sku),
  INDEX idx_kardex_branch (branch_name),
  INDEX idx_kardex_created (created_at)
);

CREATE TABLE IF NOT EXISTS branch_transfers (
  id VARCHAR(50) PRIMARY KEY,
  origin_branch VARCHAR(100) NOT NULL,
  destination_branch VARCHAR(100) NOT NULL,
  guide_number VARCHAR(50),
  status VARCHAR(30) DEFAULT 'EN_TRANSITO',
  items JSON NOT NULL,
  requested_by VARCHAR(150) NOT NULL,
  received_by VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  received_at DATETIME,
  INDEX idx_transfers_origin (origin_branch),
  INDEX idx_transfers_dest (destination_branch)
);

-- --- Fase 4: Conciliación Bancaria & Validación Antifraude ---
CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id VARCHAR(50) PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  cci VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'PEN',
  account_type VARCHAR(50) DEFAULT 'Corriente',
  account_holder VARCHAR(255) DEFAULT 'CHOHO PERÚ S.A.C.',
  status VARCHAR(20) DEFAULT 'Activo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
