/**
 * Migraciones idempotentes de esquema.
 *
 * Motivo de existir: el proyecto mantiene el esquema en dos lugares y ya diverge
 * (ver `sales_zone`). Este modulo concentra los parches ALTER de forma
 * idempotente, de modo que `init_db.ts` y `server.ts` apliquen exactamente la
 * misma migracion y no puedan quedar desfasados entre si.
 *
 * MySQL 8 no soporta `ADD COLUMN IF NOT EXISTS`, por eso cada parche se ejecuta
 * dentro de un try/catch que distingue "ya aplicado" de un error real.
 */

type Queryable = {
  query: (sql: string, params?: any[]) => Promise<any>;
};

const PATCHES: Array<{ nombre: string; sql: string; silencioso: boolean }> = [
  // --- Taxonomia de catalogo ---
  {
    nombre: "categorias",
    sql: `CREATE TABLE IF NOT EXISTS categorias (
      id VARCHAR(50) PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      parentId VARCHAR(50),
      nivel TINYINT NOT NULL DEFAULT 1,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_categorias_parent FOREIGN KEY (parentId) REFERENCES categorias(id) ON DELETE RESTRICT
    )`,
    silencioso: true
  },
  {
    nombre: "idx_categorias_parent",
    sql: "CREATE INDEX idx_categorias_parent ON categorias(parentId)",
    silencioso: true
  },
  {
    nombre: "products.categoriaId",
    sql: "ALTER TABLE products ADD COLUMN categoriaId VARCHAR(50) NULL",
    silencioso: true
  },
  {
    nombre: "idx_products_categoria",
    sql: "CREATE INDEX idx_products_categoria ON products(categoriaId)",
    silencioso: true
  },
  {
    nombre: "fk_products_categoria",
    sql: "ALTER TABLE products ADD CONSTRAINT fk_products_categoria FOREIGN KEY (categoriaId) REFERENCES categorias(id) ON DELETE RESTRICT",
    silencioso: true
  },

  // --- Picking & Empaque (Fase 1 plan ERP) ---
  {
    nombre: "picking_orders",
    sql: `CREATE TABLE IF NOT EXISTS picking_orders (
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
    )`,
    silencioso: true
  },
  {
    nombre: "picking_items",
    sql: `CREATE TABLE IF NOT EXISTS picking_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      picking_id VARCHAR(50) NOT NULL,
      sku VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      ordered_qty INT NOT NULL,
      picked_qty INT DEFAULT 0,
      package_no INT DEFAULT 1,
      is_verified TINYINT(1) DEFAULT 0,
      CONSTRAINT fk_picking_items_order FOREIGN KEY (picking_id) REFERENCES picking_orders(id) ON DELETE CASCADE
    )`,
    silencioso: true
  },
  {
    nombre: "idx_picking_quote",
    sql: "CREATE UNIQUE INDEX idx_picking_quote ON picking_orders(quote_id)",
    silencioso: true
  },

  // --- Guia de Remision Electronica (Fase 2 plan ERP) ---
  {
    nombre: "shipping_guides",
    sql: `CREATE TABLE IF NOT EXISTS shipping_guides (
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
    )`,
    silencioso: true
  },
  {
    nombre: "idx_guides_picking",
    sql: "CREATE UNIQUE INDEX idx_guides_picking ON shipping_guides(picking_id)",
    silencioso: true
  },


  // --- Fase 3: Kárdex Físico Multisede & Transferencias Internas ---
  {
    nombre: "branch_stock",
    sql: `CREATE TABLE IF NOT EXISTS branch_stock (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_name VARCHAR(100) NOT NULL,
      sku VARCHAR(50) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      min_stock INT DEFAULT 5,
      location_rack VARCHAR(50),
      UNIQUE KEY uk_branch_sku (branch_name, sku),
      INDEX idx_branch_stock_sku (sku),
      INDEX idx_branch_stock_branch (branch_name)
    )`,
    silencioso: true
  },
  {
    nombre: "kardex_movements",
    sql: `CREATE TABLE IF NOT EXISTS kardex_movements (
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
    )`,
    silencioso: true
  },
  {
    nombre: "branch_transfers",
    sql: `CREATE TABLE IF NOT EXISTS branch_transfers (
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
    )`,
    silencioso: true
  },

  // --- Fase 4: Conciliación Bancaria & Validación Antifraude ---
  {
    nombre: "company_bank_accounts",
    sql: `CREATE TABLE IF NOT EXISTS company_bank_accounts (
      id VARCHAR(50) PRIMARY KEY,
      bank_name VARCHAR(100) NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      cci VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'PEN',
      account_type VARCHAR(50) DEFAULT 'Corriente',
      account_holder VARCHAR(255) DEFAULT 'CHOHO PERÚ S.A.C.',
      status VARCHAR(20) DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    silencioso: true
  },
  {
    nombre: "payments.bank_id",
    sql: "ALTER TABLE payments ADD COLUMN bank_id VARCHAR(50)",
    silencioso: true
  },
  {
    nombre: "payments.payment_method",
    sql: "ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Transferencia'",
    silencioso: true
  },
  {
    nombre: "payments.operation_number",
    sql: "ALTER TABLE payments ADD COLUMN operation_number VARCHAR(100)",
    silencioso: true
  },
  {
    nombre: "payments.voucher_image",
    sql: "ALTER TABLE payments ADD COLUMN voucher_image LONGTEXT",
    silencioso: true
  },
  {
    nombre: "payments.reconciliation_status",
    sql: "ALTER TABLE payments ADD COLUMN reconciliation_status VARCHAR(30) DEFAULT 'CONCILIADO'",
    silencioso: true
  },
  {
    nombre: "payments.verified_by",
    sql: "ALTER TABLE payments ADD COLUMN verified_by VARCHAR(150)",
    silencioso: true
  },
  {
    nombre: "payments.verified_at",
    sql: "ALTER TABLE payments ADD COLUMN verified_at DATETIME",
    silencioso: true
  },
  {
    nombre: "idx_payments_op_number",
    sql: "CREATE INDEX idx_payments_op_number ON payments(operation_number)",
    silencioso: true
  },
  {
    nombre: "idx_payments_bank_op",
    sql: "CREATE INDEX idx_payments_bank_op ON payments(bank_id, operation_number)",
    silencioso: true
  },
  // --- Reglas de descuento administrables ---
  {
    nombre: "discount_rules.scope",
    sql: "ALTER TABLE discount_rules ADD COLUMN scope VARCHAR(30) DEFAULT 'PRODUCTO'",
    silencioso: true
  },
  {
    nombre: "discount_rules.categoriaId",
    sql: "ALTER TABLE discount_rules ADD COLUMN categoriaId VARCHAR(50)",
    silencioso: true
  },
  {
    nombre: "discount_rules.region",
    sql: "ALTER TABLE discount_rules ADD COLUMN region VARCHAR(30)",
    silencioso: true
  },
  {
    nombre: "idx_discount_rules_scope",
    sql: "CREATE INDEX idx_discount_rules_scope ON discount_rules(scope)",
    silencioso: true
  },
  {
    nombre: "idx_discount_rules_categoria",
    sql: "CREATE INDEX idx_discount_rules_categoria ON discount_rules(categoriaId)",
    silencioso: true
  },

  // --- Correccion de divergencia historica ---
  {
    nombre: "users.sales_zone",
    sql: "ALTER TABLE users ADD COLUMN sales_zone VARCHAR(100) DEFAULT 'Zona - Lima'",
    silencioso: true
  },

  // --- Campos para compatibilidad con ERP y Listas de Precios ---
  {
    nombre: "products.um",
    sql: "ALTER TABLE products ADD COLUMN um VARCHAR(20) DEFAULT 'UND'",
    silencioso: true
  },
  {
    nombre: "products.codFamilia",
    sql: "ALTER TABLE products ADD COLUMN codFamilia VARCHAR(50) NULL",
    silencioso: true
  },
  {
    nombre: "products.moneda",
    sql: "ALTER TABLE products ADD COLUMN moneda VARCHAR(10) DEFAULT 'PEN'",
    silencioso: true
  },
  {
    nombre: "products.codPrecio",
    sql: "ALTER TABLE products ADD COLUMN codPrecio VARCHAR(20) NULL",
    silencioso: true
  },
  {
    nombre: "products.tipoPrecio",
    sql: "ALTER TABLE products ADD COLUMN tipoPrecio VARCHAR(50) DEFAULT 'PRECIO 1'",
    silencioso: true
  },

  // --- Campos para cotizaciones comerciales y contacto WhatsApp ---
  {
    nombre: "quotes.clientPhone",
    sql: "ALTER TABLE quotes ADD COLUMN clientPhone VARCHAR(50) NULL",
    silencioso: true
  },
  {
    nombre: "quotes.clientAddress",
    sql: "ALTER TABLE quotes ADD COLUMN clientAddress TEXT NULL",
    silencioso: true
  },
  {
    nombre: "quotes.paymentType",
    sql: "ALTER TABLE quotes ADD COLUMN paymentType VARCHAR(50) DEFAULT 'Contado'",
    silencioso: true
  },
  {
    nombre: "quotes.validityDays",
    sql: "ALTER TABLE quotes ADD COLUMN validityDays INT DEFAULT 15",
    silencioso: true
  },

  // --- Configuración General de la Empresa, Marca y Parámetros Fiscales ---
  {
    nombre: "company_settings",
    sql: `CREATE TABLE IF NOT EXISTS company_settings (
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
    )`,
    silencioso: true
  }
];

/**
 * Migra el campo plano `products.category` al arbol de categorias (nivel 1) y
 * retira la columna legacy. Es seguro ejecutarlo mas de una vez.
 */
async function migrarCategoryACategorias(conn: Queryable) {
  try {
    const [cols]: any = await conn.query("SHOW COLUMNS FROM products LIKE 'category'");
    if (!Array.isArray(cols) || cols.length === 0) return;

    // 1. Cada category distinta se vuelve una familia de nivel 1.
    const [distintas]: any = await conn.query(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) <> ''"
    );
    for (const row of distintas) {
      const nombre = String(row.category).trim();
      const [existente]: any = await conn.query("SELECT id FROM categorias WHERE nombre = ? AND parentId IS NULL", [nombre]);
      const id = existente.length > 0 ? existente[0].id : `CAT-${nombre.toUpperCase().replace(/[^A-Z0-9]+/g, "-").substring(0, 40)}`;
      if (existente.length === 0) {
        await conn.query("INSERT INTO categorias (id, nombre, parentId, nivel) VALUES (?, ?, NULL, 1)", [id, nombre]);
      }
      await conn.query(
        "UPDATE products SET categoriaId = ? WHERE category = ? AND categoriaId IS NULL",
        [id, row.category]
      );
    }

    // 2. La columna legacy deja de ser necesaria.
    await conn.query("ALTER TABLE products DROP COLUMN category");
    console.log("[MIGRATION] products.category migrada al arbol de categorias y columna retirada");
  } catch (err: any) {
    console.warn("[MIGRATION] No se pudo migrar products.category:", err?.message);
  }
}

/**
 * Aplica todas las migraciones sobre una conexion ya abierta a la base de datos.
 */
export async function runMigrations(conn: Queryable) {
  for (const patch of PATCHES) {
    try {
      await conn.query(patch.sql);
    } catch (err: any) {
      const codigo = err?.code || "";
      const yaAplicado =
        codigo === "ER_DUP_FIELDNAME" ||
        codigo === "ER_DUP_KEYNAME" ||
        codigo === "ER_DUP_FIELDNAME_OR_INDEX" ||
        codigo === "ER_TABLE_EXISTS_ERROR" ||
        codigo === "ER_FK_DUP_NAME" ||
        codigo === "ER_DUP_CONSTRAINT_NAME" ||
        (typeof err?.message === "string" &&
          /duplicate|already exists/i.test(err.message) &&
          patch.silencioso);

      if (!yaAplicado) {
        console.warn(`[MIGRATION] Parche "${patch.nombre}" fallo:`, err?.message);
      }
    }
  }

  await migrarCategoryACategorias(conn);

  // Sembrar configuración de empresa si está vacía
  try {
    const [rows]: any = await conn.query("SELECT id FROM company_settings WHERE id = 'default'");
    if (!Array.isArray(rows) || rows.length === 0) {
      const defaultBankAccounts = JSON.stringify([
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
      ]);
      await conn.query(
        `INSERT INTO company_settings (id, companyName, tradeName, ruc, address, phone, email, billingEmail, website, slogan, igvPercent, exchangeRate, defaultCurrency, defaultValidityDays, bankAccounts)
         VALUES ('default', 'CHOHO PERÚ S.A.C.', 'CHOHO® PERÚ', '20608542193', 'Av. República de Panamá 3505, San Isidro, Lima', '(01) 719-2000', 'ventas@choho.pe', 'facturacion@choho.pe', 'www.choho.pe', 'MEJOR QUE EL ORIGINAL', 18.00, 3.750, 'PEN', 15, ?)`,
        [defaultBankAccounts]
      );
      console.log("[MIGRATION] Configuración de empresa inicializada por defecto");
    }
  } catch (err: any) {
    console.warn("[MIGRATION] Error inicializando company_settings:", err?.message);
  }


  // Sembrar branch_stock y movimientos iniciales de Kardex si la tabla está vacía
  try {
    const [countRows]: any = await conn.query("SELECT COUNT(*) as count FROM branch_stock");
    const count = Array.isArray(countRows) && countRows[0] ? Number(countRows[0].count) : 0;
    if (count === 0) {
      const [prods]: any = await conn.query("SELECT sku, name, stock, basePrice FROM products");
      const branches = ["Sede Lima Centro", "Sede Arequipa", "Sede Trujillo", "Sede Huancayo"];
      for (const p of (prods || [])) {
        for (const b of branches) {
          const isLima = b === "Sede Lima Centro";
          const qty = isLima ? Math.max(0, Number(p.stock) || 0) : 0;
          await conn.query(
            "INSERT INTO branch_stock (branch_name, sku, stock, min_stock, location_rack) VALUES (?, ?, ?, 5, ?)",
            [b, p.sku, qty, isLima ? "A-01" : "REG-01"]
          );
          if (isLima && qty > 0) {
            await conn.query(
              "INSERT INTO kardex_movements (branch_name, sku, movement_type, document_reference, initial_stock, quantity, final_stock, unit_cost, operator) VALUES (?, ?, 'ENTRADA_COMPRA', 'INV-INICIAL', 0, ?, ?, ?, 'Sistema CHOHO')",
              [b, p.sku, qty, qty, Number(p.basePrice || 0) * 0.70]
            );
          }
        }
      }
      console.log("[MIGRATION] Matriz de Stock Multisede y Kardex inicializados correctamente");
    }
  } catch (err: any) {
    console.warn("[MIGRATION] Error inicializando branch_stock:", err?.message);
  }

  // Sembrar cuentas bancarias oficiales de la empresa si está vacía
  try {
    const [bankRows]: any = await conn.query("SELECT COUNT(*) as count FROM company_bank_accounts");
    const bankCount = Array.isArray(bankRows) && bankRows[0] ? Number(bankRows[0].count) : 0;
    if (bankCount === 0) {
      const defaultAccounts = [
        ["CTA-BCP-PEN", "Banco de Crédito del Perú (BCP)", "191-2849102-0-45", "002-191-002849102045-52", "PEN", "Corriente", "CHOHO PERÚ S.A.C.", "Activo"],
        ["CTA-BBVA-PEN", "BBVA Continental", "0011-0320-0100084920", "011-320-000100084920-81", "PEN", "Corriente", "CHOHO PERÚ S.A.C.", "Activo"],
        ["CTA-IBK-USD", "Interbank", "200-3001284921", "003-200-003001284921-14", "USD", "Corriente", "CHOHO PERÚ S.A.C.", "Activo"],
        ["CTA-YAPE-PEN", "Yape / Plin Comercial", "987-654-321", "", "PEN", "Billetera Digital", "CHOHO PERÚ S.A.C.", "Activo"]
      ];
      for (const acc of defaultAccounts) {
        await conn.query(
          "INSERT INTO company_bank_accounts (id, bank_name, account_number, cci, currency, account_type, account_holder, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          acc
        );
      }
      console.log("[MIGRATION] Cuentas bancarias de empresa inicializadas");
    }
  } catch (err: any) {
    console.warn("[MIGRATION] Error inicializando company_bank_accounts:", err?.message);
  }

  console.log("[MIGRATION] Esquema actualizado a la version actual");
}
