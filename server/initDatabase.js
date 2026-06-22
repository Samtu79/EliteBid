const fs = require('fs/promises');
const path = require('path');

const { connectWithoutDatabase, database, getPool, query, run } = require('./db');
const { hashPassword } = require('./passwordHash');

async function initDatabase() {
  if (process.env.DB_CREATE_DATABASE !== 'false') {
    const connection = await connectWithoutDatabase();

    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } finally {
      await connection.end();
    }
  }

  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await getPool().query(schema);
  await migrateSecuritySchema();
  await seedDatabase();
  await normalizeUnstartedLotItems();
}

async function normalizeUnstartedLotItems() {
  await run(
    `UPDATE items_catalogo i
     LEFT JOIN pujos p ON p.item = i.identificador
     SET i.puja_actual = 0
     WHERE p.identificador IS NULL
       AND i.cierre_estado = 'esperando_puja'
       AND i.timer_vencimiento IS NULL`
  );
}

async function migrateSecuritySchema() {
  await run("ALTER TABLE usuarios MODIFY rol ENUM('invitado', 'cliente', 'admin') DEFAULT 'cliente'");
  await run("ALTER TABLE usuarios MODIFY estado ENUM('pendiente', 'activo', 'bloqueado') DEFAULT 'activo'");
  await run('ALTER TABLE usuarios MODIFY password VARCHAR(255) NOT NULL');
  await addColumnIfMissing(
    'personas',
    'tipo_documento',
    "ALTER TABLE personas ADD COLUMN tipo_documento ENUM('dni', 'pasaporte') DEFAULT 'dni' AFTER identificador"
  );
  await run("ALTER TABLE personas MODIFY tipo_documento ENUM('dni', 'pasaporte') DEFAULT 'dni'");
  await addColumnIfMissing(
    'personas',
    'foto',
    'ALTER TABLE personas ADD COLUMN foto LONGBLOB AFTER estado'
  );
  await run('ALTER TABLE personas MODIFY foto_uri MEDIUMTEXT');
  await run('ALTER TABLE documentos_identidad MODIFY frente_uri MEDIUMTEXT NOT NULL');
  await run('ALTER TABLE documentos_identidad MODIFY dorso_uri MEDIUMTEXT NOT NULL');
  await addColumnIfMissing(
    'solicitudes_lotes',
    'modo_lote',
    "ALTER TABLE solicitudes_lotes ADD COLUMN modo_lote ENUM('unico', 'variado') DEFAULT 'unico' AFTER titulo"
  );
  await addColumnIfMissing(
    'solicitudes_lotes',
    'composicion',
    'ALTER TABLE solicitudes_lotes ADD COLUMN composicion TEXT AFTER valor_estimado'
  );
  await run("ALTER TABLE solicitudes_lotes MODIFY estado ENUM('pendiente', 'en_inspeccion', 'aceptado', 'rechazado', 'a_confirmar', 'en_subasta') DEFAULT 'pendiente'");
  await addColumnIfMissing(
    'solicitudes_lotes',
    'subasta_generada',
    'ALTER TABLE solicitudes_lotes ADD COLUMN subasta_generada INT AFTER comision'
  );
  await addColumnIfMissing(
    'solicitudes_lotes',
    'catalogo_generado',
    'ALTER TABLE solicitudes_lotes ADD COLUMN catalogo_generado INT AFTER subasta_generada'
  );
  await addColumnIfMissing(
    'usuarios',
    'email_verificado',
    "ALTER TABLE usuarios ADD COLUMN email_verificado ENUM('si', 'no') DEFAULT 'no'"
  );
  await addColumnIfMissing(
    'usuarios',
    'verification_token',
    'ALTER TABLE usuarios ADD COLUMN verification_token VARCHAR(180)'
  );
  await addColumnIfMissing(
    'usuarios',
    'verification_code_hash',
    'ALTER TABLE usuarios ADD COLUMN verification_code_hash VARCHAR(255)'
  );
  await addColumnIfMissing(
    'usuarios',
    'verification_code_expires_at',
    'ALTER TABLE usuarios ADD COLUMN verification_code_expires_at DATETIME'
  );
  await addColumnIfMissing(
    'usuarios',
    'password_reset_code_hash',
    'ALTER TABLE usuarios ADD COLUMN password_reset_code_hash VARCHAR(255)'
  );
  await addColumnIfMissing(
    'usuarios',
    'password_reset_expires_at',
    'ALTER TABLE usuarios ADD COLUMN password_reset_expires_at DATETIME'
  );
  await addColumnIfMissing(
    'items_catalogo',
    'orden_lote',
    'ALTER TABLE items_catalogo ADD COLUMN orden_lote INT NOT NULL DEFAULT 0 AFTER catalogo'
  );
  const catalogItems = await query(
    'SELECT identificador AS id, catalogo AS catalogId, orden_lote AS lotOrder FROM items_catalogo ORDER BY catalogo ASC, identificador ASC'
  );
  let currentCatalogId = null;
  let lotOrder = 0;
  for (const item of catalogItems) {
    if (Number(item.catalogId) !== Number(currentCatalogId)) {
      currentCatalogId = item.catalogId;
      lotOrder = 0;
    }
    lotOrder += 1;
    if (!Number(item.lotOrder)) {
      await run('UPDATE items_catalogo SET orden_lote = ? WHERE identificador = ?', [lotOrder, item.id]);
    }
  }
  await addColumnIfMissing(
    'items_catalogo',
    'timer_inicio',
    'ALTER TABLE items_catalogo ADD COLUMN timer_inicio DATETIME AFTER puja_actual'
  );
  await addColumnIfMissing(
    'items_catalogo',
    'timer_vencimiento',
    'ALTER TABLE items_catalogo ADD COLUMN timer_vencimiento DATETIME AFTER timer_inicio'
  );
  await addColumnIfMissing(
    'items_catalogo',
    'cierre_estado',
    "ALTER TABLE items_catalogo ADD COLUMN cierre_estado ENUM('esperando_puja', 'en_cuenta', 'finalizada') DEFAULT 'esperando_puja' AFTER timer_vencimiento"
  );
  await run("ALTER TABLE items_catalogo MODIFY cierre_estado ENUM('esperando_puja', 'en_cuenta', 'finalizada') DEFAULT 'esperando_puja'");
  await addColumnIfMissing(
    'items_catalogo',
    'cierre_motivo',
    'ALTER TABLE items_catalogo ADD COLUMN cierre_motivo VARCHAR(80) AFTER cierre_estado'
  );
  await addColumnIfMissing(
    'pujos',
    'medio_pago',
    'ALTER TABLE pujos ADD COLUMN medio_pago INT AFTER item'
  );
  await addColumnIfMissing(
    'registro_de_subasta',
    'medio_pago',
    'ALTER TABLE registro_de_subasta ADD COLUMN medio_pago INT AFTER cliente'
  );
  await addColumnIfMissing(
    'registro_de_subasta',
    'estado_pago',
    "ALTER TABLE registro_de_subasta ADD COLUMN estado_pago ENUM('pendiente', 'pagada', 'multa') DEFAULT 'pendiente' AFTER comision"
  );
  await run("ALTER TABLE registro_de_subasta MODIFY estado_pago ENUM('pendiente', 'pagada', 'multa') DEFAULT 'pendiente'");
  await addColumnIfMissing(
    'registro_de_subasta',
    'direccion_entrega',
    'ALTER TABLE registro_de_subasta ADD COLUMN direccion_entrega VARCHAR(255) AFTER estado_pago'
  );
  await run("ALTER TABLE subastas MODIFY moneda ENUM('ARS', 'USD') DEFAULT 'ARS'");
  await run("ALTER TABLE medios_pago MODIFY moneda ENUM('ARS', 'USD') DEFAULT 'ARS'");
  await addColumnIfMissing(
    'medios_pago',
    'seleccionado',
    "ALTER TABLE medios_pago ADD COLUMN seleccionado ENUM('si', 'no') DEFAULT 'no' AFTER verificado"
  );
  await run("ALTER TABLE penalidades MODIFY estado ENUM('activa', 'pagada', 'vencida') DEFAULT 'activa'");
  await run('ALTER TABLE penalidades MODIFY vencimiento DATE');
  await run(
    `CREATE TABLE IF NOT EXISTS penalidad_falta_fondos (
      penalidad INT PRIMARY KEY,
      puja INT NOT NULL,
      registro INT,
      total_requerido DECIMAL(14,2) NOT NULL DEFAULT 0,
      vencimiento_fondos DATETIME NOT NULL,
      multa_pagada_en DATETIME,
      fondos_presentados ENUM('si', 'no') DEFAULT 'no',
      fondos_presentados_en DATETIME,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_penalidad_fondos_penalidad FOREIGN KEY (penalidad) REFERENCES penalidades (identificador)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS sectores (
      identificador INT AUTO_INCREMENT PRIMARY KEY,
      nombreSector VARCHAR(150) NOT NULL,
      codigoSector VARCHAR(10),
      responsableSector INT,
      CONSTRAINT fk_sectores_empleados FOREIGN KEY (responsableSector) REFERENCES empleados (identificador)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS fotos (
      identificador INT AUTO_INCREMENT PRIMARY KEY,
      producto INT NOT NULL,
      foto LONGBLOB,
      uri MEDIUMTEXT,
      orden INT NOT NULL DEFAULT 1,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_fotos_productos FOREIGN KEY (producto) REFERENCES productos (identificador)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  const legacyUsers = await query(
    "SELECT id, password FROM usuarios WHERE password NOT LIKE 'scrypt$%'"
  );

  for (const user of legacyUsers) {
    await run('UPDATE usuarios SET password = ? WHERE id = ?', [
      await hashPassword(user.password),
      user.id
    ]);
  }
}

async function addColumnIfMissing(tableName, columnName, ddl) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (Number(rows[0]?.total || 0) === 0) {
    await run(ddl);
  }
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

async function resetAuctionSeedData() {
  await run('CREATE TEMPORARY TABLE IF NOT EXISTS productos_subastas_cleanup (identificador INT PRIMARY KEY)');
  await run('DELETE FROM productos_subastas_cleanup');
  await run('INSERT IGNORE INTO productos_subastas_cleanup SELECT DISTINCT producto FROM items_catalogo');
  await run(
    `UPDATE solicitudes_lotes
     SET estado = CASE WHEN estado = 'en_subasta' THEN 'pendiente' ELSE estado END,
       subasta_generada = NULL,
       catalogo_generado = NULL
     WHERE subasta_generada IS NOT NULL OR catalogo_generado IS NOT NULL`
  );
  await run(
    `DELETE pf FROM penalidad_falta_fondos pf
     JOIN pujos p ON p.identificador = pf.puja`
  );
  await run('DELETE FROM registro_de_subasta');
  await run('DELETE FROM favoritos');
  await run('DELETE FROM pujos');
  await run('DELETE FROM asistentes');
  await run('DELETE FROM items_catalogo');
  await run('DELETE FROM catalogos');
  await run('DELETE FROM subastas');
  await run(
    `DELETE f FROM fotos f
     JOIN productos_subastas_cleanup p ON p.identificador = f.producto`
  );
  await run(
    `DELETE pr FROM productos pr
     JOIN productos_subastas_cleanup p ON p.identificador = pr.identificador`
  );
  await run('ALTER TABLE subastas AUTO_INCREMENT = 1');
  await run('ALTER TABLE catalogos AUTO_INCREMENT = 1');
  await run('ALTER TABLE items_catalogo AUTO_INCREMENT = 1');
  await run('ALTER TABLE pujos AUTO_INCREMENT = 1');
  await run('ALTER TABLE asistentes AUTO_INCREMENT = 1');
  await run('ALTER TABLE registro_de_subasta AUTO_INCREMENT = 1');
}

async function seedDatabase() {
  await run(
    `INSERT IGNORE INTO paises (numero, nombre, nombre_corto, capital, nacionalidad, idiomas)
     VALUES
     (32, 'Argentina', 'AR', 'Buenos Aires', 'Argentina', 'Espanol')`
  );
  await run('UPDATE clientes SET numero_pais = ? WHERE numero_pais IS NULL OR numero_pais <> ?', [32, 32]);
  await run('UPDATE duenios SET numero_pais = ? WHERE numero_pais IS NULL OR numero_pais <> ?', [32, 32]);
  await run('DELETE FROM paises WHERE numero <> ?', [32]);

  await run(
    `INSERT IGNORE INTO personas (identificador, documento, nombre, direccion, estado)
     VALUES
     (1, '30999111', 'Alejandro Vega', 'Av. Alvear 1800, CABA', 'activo'),
     (2, '22111999', 'Mara Santoro', 'Recoleta, CABA', 'activo'),
     (3, '18000999', 'Rafael Montero', 'Palermo, CABA', 'activo')`
  );
  await run('INSERT IGNORE INTO empleados (identificador, cargo, sector) VALUES (?, ?, ?)', [
    2,
    'Verificador senior',
    1
  ]);
  await run(
    `INSERT IGNORE INTO sectores (identificador, nombreSector, codigoSector, responsableSector)
     VALUES (?, ?, ?, ?)`,
    [1, 'Verificacion y catalogacion', 'VER', 2]
  );
  await run(
    `INSERT IGNORE INTO clientes (identificador, numero_pais, admitido, categoria, verificador)
     VALUES (?, ?, ?, ?, ?)`,
    [1, 32, 'si', 'platino', 2]
  );
  await run(
    `INSERT IGNORE INTO personas (identificador, documento, nombre, direccion, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [4, '00000000', 'Empresa EliteBid', 'Av. Alvear 1800, CABA', 'activo']
  );
  await run(
    `INSERT IGNORE INTO clientes (identificador, numero_pais, admitido, categoria, verificador)
     VALUES (?, ?, ?, ?, ?)`,
    [4, 32, 'si', 'platino', 2]
  );
  await run('UPDATE registro_de_subasta SET cliente = ? WHERE cliente = ?', [4, 900001]);
  await run('DELETE FROM clientes WHERE identificador = ?', [900001]);
  await run('DELETE FROM personas WHERE identificador = ?', [900001]);
  await run("UPDATE clientes SET categoria = 'platino' WHERE identificador = ?", [1]);
  await run(
    `INSERT IGNORE INTO duenios (identificador, numero_pais, verificacion_financiera, verificacion_judicial, calificacion_riesgo, verificador)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [3, 32, 'si', 'si', 2, 2]
  );
  await run('INSERT IGNORE INTO subastadores (identificador, matricula, region) VALUES (?, ?, ?)', [
    2,
    'MAT-8821',
    'CABA'
  ]);
  await run(
    `INSERT IGNORE INTO usuarios (id, cliente_id, email, password, nombre, rol, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 1, 'alejandro@elitebid.com', await hashPassword('Elite1234'), 'Alejandro', 'cliente', 'activo']
  );
  await run("UPDATE usuarios SET email_verificado = 'si' WHERE email = ?", ['alejandro@elitebid.com']);
  await run(
    `UPDATE usuarios
     SET password = ?
     WHERE email = ? AND password = ?`,
    [await hashPassword('Elite1234'), 'alejandro@elitebid.com', 'Elite1234']
  );
  await run(
    `INSERT IGNORE INTO medios_pago (identificador, cliente, tipo, detalle, moneda, monto_garantia, verificado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      1,
      'tarjeta',
      JSON.stringify({ brand: 'VISA', cardHolder: 'Alejandro Vega', cardNumberLast4: '2048', expiry: '12/29' }),
      'ARS',
      65000000,
      'si'
    ]
  );

  // Cuentas fijas para demostrar los distintos estados de penalidad.
  // Se mantienen separadas de las cuentas reales y pueden usarse en cada demo.
  const demoPenaltyAccounts = [
    {
      id: 21,
      document: '40000021',
      name: 'Demo Sin Penalidad',
      email: 'demo.limpio@elitebid.com',
      category: 'comun',
      penalty: null
    },
    {
      id: 22,
      document: '40000022',
      name: 'Demo Penalidad Activa',
      email: 'demo.activa@elitebid.com',
      category: 'plata',
      penalty: ['Penalidad activa de demostracion', 'Saldo pendiente por incumplimiento de pago.', 25000, 'activa', '2026-12-31']
    },
    {
      id: 23,
      document: '40000023',
      name: 'Demo Penalidad Vencida',
      email: 'demo.vencida@elitebid.com',
      category: 'oro',
      penalty: ['Penalidad vencida de demostracion', 'Penalidad de prueba fuera de termino.', 40000, 'vencida', '2026-06-01']
    },
    {
      id: 24,
      document: '40000024',
      name: 'Demo Penalidad Pagada',
      email: 'demo.pagada@elitebid.com',
      category: 'especial',
      penalty: ['Penalidad pagada de demostracion', 'Penalidad de prueba ya regularizada.', 15000, 'pagada', '2026-06-10']
    }
  ];

  for (const account of demoPenaltyAccounts) {
    await run(
      `INSERT IGNORE INTO personas (identificador, documento, nombre, direccion, estado)
       VALUES (?, ?, ?, ?, 'activo')`,
      [account.id, account.document, account.name, 'Cuenta interna de demostracion']
    );
    await run(
      `INSERT IGNORE INTO clientes (identificador, numero_pais, admitido, categoria, verificador)
       VALUES (?, ?, 'si', ?, ?)`,
      [account.id, 32, account.category, 2]
    );
    await run(
      `INSERT IGNORE INTO usuarios (id, cliente_id, email, password, nombre, rol, estado, email_verificado)
       VALUES (?, ?, ?, ?, ?, 'cliente', 'activo', 'si')`,
      [account.id, account.id, account.email, await hashPassword('Demo1234'), account.name]
    );
    await run(
      `UPDATE usuarios SET password = ?, estado = 'activo', email_verificado = 'si'
       WHERE email = ?`,
      [await hashPassword('Demo1234'), account.email]
    );
    await run(
      `INSERT IGNORE INTO medios_pago (identificador, cliente, tipo, detalle, moneda, monto_garantia, verificado)
       VALUES (?, ?, 'tarjeta', ?, 'ARS', ?, 'si')`,
      [
        account.id,
        account.id,
        JSON.stringify({ brand: 'VISA', cardHolder: account.name, cardNumberLast4: String(6000 + account.id), expiry: '12/29' }),
        1000000
      ]
    );
    if (account.penalty) {
      await run(
        `INSERT IGNORE INTO penalidades (identificador, cliente, titulo, descripcion, importe, estado, vencimiento)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [account.id, account.id, ...account.penalty]
      );
    }
  }

  if (process.env.RESET_DEMO_DATA === 'true') {
    await resetAuctionSeedData();
  }
  const now = new Date();
  const schedule = (minutesFromNow) => {
    const startsAt = addMinutes(now, minutesFromNow);
    return {
      date: formatDate(startsAt),
      time: formatTime(startsAt)
    };
  };
  const auctions = [
    {
      id: 11,
      title: 'Sala en vivo: Porsche 911 Targa 1972',
      ...schedule(0),
      durationMinutes: 55,
      status: 'abierta',
      category: 'platino',
      currency: 'USD',
      location: 'Hangar Norte, San Fernando',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
      product: 'Porsche 911 Targa 1972 restaurado, matching numbers y dossier tecnico completo.',
      basePrice: 92000,
      extraItems: [
        {
          product: 'Set de herramientas original Porsche con estuche de epoca.',
          image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
          basePrice: 3200
        },
        {
          product: 'Volante deportivo de madera para coupe clasica.',
          image: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80',
          basePrice: 1800
        }
      ]
    },
    {
      id: 12,
      title: 'Sala en vivo: Arte abstracto latinoamericano',
      ...schedule(18),
      durationMinutes: 65,
      status: 'abierta',
      category: 'oro',
      currency: 'ARS',
      location: 'Galeria Norte, Recoleta',
      image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=900&q=80',
      product: 'Oleo abstracto de gran formato con certificado de procedencia.',
      basePrice: 9800000,
      extraItems: [
        {
          product: 'Escultura en bronce patinado, serie numerada.',
          image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988f7?auto=format&fit=crop&w=900&q=80',
          basePrice: 3200000
        },
        {
          product: 'Grabado firmado con marco de madera original.',
          image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=900&q=80',
          basePrice: 850000
        }
      ]
    },
    {
      id: 13,
      title: 'Sala en vivo: Relojeria suiza de coleccion',
      ...schedule(36),
      durationMinutes: 70,
      status: 'abierta',
      category: 'plata',
      currency: 'ARS',
      location: 'Salon Nocturne, Puerto Madero',
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80',
      product: 'Reloj mecanico suizo con calendario perpetuo y caja de oro.',
      basePrice: 4800000,
      extraItems: [
        {
          product: 'Cronografo de acero con taquimetro y estuche original.',
          image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80',
          basePrice: 2150000
        },
        {
          product: 'Reloj de vestir automatico con esfera champagne.',
          image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80',
          basePrice: 1750000
        }
      ]
    },
    {
      id: 1,
      title: 'Diseno argentino contemporaneo',
      ...schedule(70),
      status: 'programada',
      category: 'comun',
      currency: 'ARS',
      location: 'Espacio Retiro',
      image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80',
      product: 'Sillon de autor argentino con estructura de madera maciza.',
      basePrice: 360000,
      extraItems: [
        {
          product: 'Mesa auxiliar de nogal con tapa circular.',
          image: 'https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=900&q=80',
          basePrice: 180000
        },
        {
          product: 'Lampara industrial restaurada con pantalla metalica.',
          image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
          basePrice: 145000
        }
      ]
    },
    {
      id: 2,
      title: 'Fotografia de autor y camaras analogicas',
      ...schedule(105),
      status: 'programada',
      category: 'especial',
      currency: 'ARS',
      location: 'Galeria Central',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      product: 'Camara Leica M3 revisada con lente Summicron 50mm.',
      basePrice: 1250000,
      extraItems: [
        {
          product: 'Copia fotografica pigmentaria firmada y numerada.',
          image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=80',
          basePrice: 420000
        },
        {
          product: 'Camara reflex analogica Nikon con lente 35mm.',
          image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=900&q=80',
          basePrice: 310000
        }
      ]
    },
    {
      id: 3,
      title: 'Numismatica del Rio de la Plata',
      ...schedule(140),
      status: 'programada',
      category: 'comun',
      currency: 'ARS',
      location: 'Sala Federal, CABA',
      image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=900&q=80',
      product: 'Coleccion de monedas argentinas certificadas en capsulas individuales.',
      basePrice: 240000,
      extraItems: [
        {
          product: 'Medalla conmemorativa de plata de exposicion nacional.',
          image: 'https://images.unsplash.com/photo-1644424235476-295f24d503d9?auto=format&fit=crop&w=900&q=80',
          basePrice: 115000
        },
        {
          product: 'Billete argentino de coleccion en estado sin circular.',
          image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=900&q=80',
          basePrice: 98000
        }
      ]
    },
    {
      id: 4,
      title: 'Joyas art deco certificadas',
      ...schedule(175),
      status: 'programada',
      category: 'oro',
      currency: 'USD',
      location: 'Salon Alvear',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
      product: 'Anillo art deco en oro blanco con piedra central certificada.',
      basePrice: 14500,
      extraItems: [
        {
          product: 'Collar antiguo con perlas naturales y broche original.',
          image: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=900&q=80',
          basePrice: 9800
        },
        {
          product: 'Pulsera de oro amarillo con eslabones articulados.',
          image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80',
          basePrice: 7600
        }
      ]
    },
    {
      id: 5,
      title: 'Instrumentos musicales de coleccion',
      ...schedule(210),
      status: 'programada',
      category: 'plata',
      currency: 'ARS',
      location: 'Auditorio San Telmo',
      image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=80',
      product: 'Guitarra acustica de luthier con tapa de abeto macizo.',
      basePrice: 890000,
      extraItems: [
        {
          product: 'Violin aleman de estudio avanzado con estuche rigido.',
          image: 'https://images.unsplash.com/photo-1465821185615-20b3c2fbf41b?auto=format&fit=crop&w=900&q=80',
          basePrice: 760000
        },
        {
          product: 'Saxofon alto vintage revisado por tecnico especializado.',
          image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=80',
          basePrice: 680000
        }
      ]
    },
    {
      id: 6,
      title: 'Porcelana europea y vajilla fina',
      ...schedule(240),
      status: 'programada',
      category: 'especial',
      currency: 'ARS',
      location: 'Salon Dorrego',
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80',
      product: 'Juego de te ingles de 18 piezas en porcelana esmaltada.',
      basePrice: 620000,
      extraItems: [
        {
          product: 'Centro de mesa de porcelana francesa pintado a mano.',
          image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=80',
          basePrice: 280000
        },
        {
          product: 'Par de tazas de coleccion con borde dorado.',
          image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80',
          basePrice: 155000
        }
      ]
    },
    {
      id: 7,
      title: 'Libros raros y documentos historicos',
      ...schedule(270),
      status: 'programada',
      category: 'comun',
      currency: 'ARS',
      location: 'Archivo Central',
      image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
      product: 'Primera edicion encuadernada con anotaciones marginales.',
      basePrice: 410000,
      extraItems: [
        {
          product: 'Mapa litografiado de Buenos Aires con marco de epoca.',
          image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80',
          basePrice: 280000
        },
        {
          product: 'Set de plumas y tintero de escritorio, circa 1890.',
          image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
          basePrice: 160000
        }
      ]
    },
    {
      id: 8,
      title: 'Automovilismo historico y memorabilia',
      ...schedule(292),
      status: 'programada',
      category: 'oro',
      currency: 'ARS',
      location: 'Club de Automoviles Clasicos',
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
      product: 'Casco de competicion vintage con grafica original.',
      basePrice: 540000,
      extraItems: [
        {
          product: 'Chaqueta de piloto de cuero con insignias bordadas.',
          image: 'https://images.unsplash.com/photo-1520975682031-a9c72fdf6d2d?auto=format&fit=crop&w=900&q=80',
          basePrice: 390000
        },
        {
          product: 'Placa esmaltada de automovilismo argentino.',
          image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
          basePrice: 250000
        }
      ]
    },
    {
      id: 9,
      title: 'Tecnologia retro y videojuegos clasicos',
      ...schedule(320),
      status: 'programada',
      category: 'especial',
      currency: 'ARS',
      location: 'Centro Cultural Abasto',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
      product: 'Consola familiar japonesa de primera generacion con caja original.',
      basePrice: 520000,
      extraItems: [
        {
          product: 'Lote de cartuchos clasicos con manuales conservados.',
          image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80',
          basePrice: 260000
        },
        {
          product: 'Computadora personal retro restaurada y funcional.',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
          basePrice: 430000
        }
      ]
    },
    {
      id: 10,
      title: 'Bodega privada: vinos de guarda',
      ...schedule(350),
      status: 'programada',
      category: 'plata',
      currency: 'ARS',
      location: 'Cava Mendoza, Palermo',
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
      product: 'Caja vertical de Malbec de alta gama, cosechas seleccionadas.',
      basePrice: 730000,
      extraItems: [
        {
          product: 'Estuche de Cabernet Sauvignon reserva con guarda certificada.',
          image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=80',
          basePrice: 410000
        },
        {
          product: 'Decantador de cristal y accesorios de sommelier.',
          image: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=900&q=80',
          basePrice: 190000
        }
      ]
    },
    {
      id: 14,
      title: 'Diseño industrial y luminarias italianas',
      ...schedule(390),
      status: 'programada',
      category: 'oro',
      currency: 'USD',
      location: 'Showroom Distrito Arenales',
      image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80',
      product: 'Lampara italiana de pie cromada, decada del setenta.',
      basePrice: 6800,
      extraItems: [
        {
          product: 'Par de apliques murales de diseño modernista.',
          image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
          basePrice: 2400
        },
        {
          product: 'Silla de autor con estructura tubular y cuero original.',
          image: 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=900&q=80',
          basePrice: 3100
        }
      ]
    }
  ];

  for (const auction of auctions) {
    await seedAuction(auction);
  }

  await run(
    `INSERT IGNORE INTO penalidades (identificador, cliente, titulo, descripcion, importe, estado, vencimiento)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      1,
      'Retraso en pago',
      'Incumplimiento de plazo para Rolex Daytona 1968. La cuenta tiene restricciones temporales de puja.',
      15000,
      'activa',
      '2026-06-02'
    ]
  );
}

async function seedAuction(auction) {
  await run(
    `INSERT IGNORE INTO subastas (identificador, titulo, fecha, hora, estado, subastador, ubicacion, capacidad_asistentes, tiene_deposito, seguridad_propia, categoria, moneda, imagen_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      auction.id,
      auction.title,
      auction.date,
      auction.time,
      auction.status,
      2,
      auction.location,
      120,
      'si',
      'si',
      auction.category,
      auction.currency || 'ARS',
      auction.image
    ]
  );
  await run(
    `INSERT IGNORE INTO productos (identificador, fecha, disponible, descripcion_catalogo, descripcion_completa, revisor, duenio, seguro, imagen_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [auction.id, auction.date, 'si', auction.product, auction.product, 2, 3, null, auction.image]
  );
  await seedProductPhotos(auction.id, auction.image);
  await run(
    `INSERT IGNORE INTO catalogos (identificador, descripcion, subasta, responsable)
     VALUES (?, ?, ?, ?)`,
    [auction.id, `Catalogo ${auction.title}`, auction.id, 2]
  );
  await run(
    `INSERT IGNORE INTO items_catalogo (identificador, catalogo, orden_lote, producto, precio_base, comision, subastado, puja_actual)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [auction.id, auction.id, 1, auction.id, auction.basePrice, auction.basePrice * 0.12, 'no', auction.currentBid || 0]
  );

  const additionalLotItems = auction.extraItems?.length
    ? auction.extraItems
    : [
        {
          product: `${auction.title}: pieza complementaria I.`,
          image: auction.image,
          basePrice: Math.max(1, Math.round(auction.basePrice * 0.6))
        },
        {
          product: `${auction.title}: pieza complementaria II.`,
          image: auction.image,
          basePrice: Math.max(1, Math.round(auction.basePrice * 0.35))
        }
      ];

  for (const [index, item] of additionalLotItems.entries()) {
    const productId = auction.id * 100 + index + 1;
    const itemId = auction.id * 100 + index + 1;
    await run(
      `INSERT IGNORE INTO productos (identificador, fecha, disponible, descripcion_catalogo, descripcion_completa, revisor, duenio, seguro, imagen_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, auction.date, 'si', item.product, item.product, 2, 3, null, item.image || auction.image]
    );
    await seedProductPhotos(productId, item.image || auction.image);
    await run(
      `INSERT IGNORE INTO items_catalogo (identificador, catalogo, orden_lote, producto, precio_base, comision, subastado, puja_actual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, auction.id, index + 2, productId, item.basePrice, item.basePrice * 0.12, 'no', item.currentBid || 0]
    );
  }

}

async function seedProductPhotos(productId, uri) {
  if (!uri) return;

  for (let order = 1; order <= 6; order += 1) {
    const photoUri = `${uri}${uri.includes('?') ? '&' : '?'}photo=${order}`;
    await run(
      `INSERT INTO fotos (producto, uri, orden)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM fotos WHERE producto = ? AND orden = ?
       )`,
      [productId, photoUri, order, productId, order]
    );
    await run('UPDATE fotos SET uri = ? WHERE producto = ? AND orden = ?', [photoUri, productId, order]);
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log(`Base MySQL '${database}' inicializada.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
