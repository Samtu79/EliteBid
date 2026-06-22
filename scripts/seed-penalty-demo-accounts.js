const { run, query } = require('../server/db');
const { hashPassword } = require('../server/passwordHash');

const PASSWORD = 'Demo1234';
const accounts = [
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

async function seedDemoPenaltyAccounts() {
  const passwordHash = await hashPassword(PASSWORD);

  for (const account of accounts) {
    await run(
      `INSERT INTO personas (identificador, documento, nombre, direccion, estado)
       VALUES (?, ?, ?, ?, 'activo')
       ON DUPLICATE KEY UPDATE documento = VALUES(documento), nombre = VALUES(nombre), estado = 'activo'`,
      [account.id, account.document, account.name, 'Cuenta interna de demostracion']
    );
    await run(
      `INSERT INTO clientes (identificador, numeroPais, admitido, categoria, verificador)
       VALUES (?, 32, 'si', ?, 2)
       ON DUPLICATE KEY UPDATE admitido = 'si', categoria = VALUES(categoria), verificador = 2`,
      [account.id, account.category]
    );
    await run(
      `INSERT INTO usuarios (id, cliente_id, email, password, nombre, rol, estado, email_verificado)
       VALUES (?, ?, ?, ?, ?, 'cliente', 'activo', 'si')
       ON DUPLICATE KEY UPDATE password = VALUES(password), nombre = VALUES(nombre), rol = 'cliente', estado = 'activo', email_verificado = 'si'`,
      [account.id, account.id, account.email, passwordHash, account.name]
    );
    await run(
      `INSERT INTO medios_pago (identificador, cliente, tipo, detalle, moneda, monto_garantia, verificado)
       VALUES (?, ?, 'tarjeta', ?, 'ARS', 1000000, 'si')
       ON DUPLICATE KEY UPDATE monto_garantia = 1000000, verificado = 'si'`,
      [
        account.id,
        account.id,
        JSON.stringify({ brand: 'VISA', cardHolder: account.name, cardNumberLast4: String(6000 + account.id), expiry: '12/29' })
      ]
    );
    await run('DELETE FROM penalidades WHERE cliente = ?', [account.id]);
    if (account.penalty) {
      await run(
        `INSERT INTO penalidades (cliente, titulo, descripcion, importe, estado, vencimiento)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [account.id, ...account.penalty]
      );
    }
  }

  const rows = await query(
    `SELECT u.email, c.categoria, COALESCE(p.estado, 'sin_penalidad') AS penalidad
     FROM usuarios u
     JOIN clientes c ON c.identificador = u.cliente_id
     LEFT JOIN penalidades p ON p.cliente = c.identificador
     WHERE u.email IN (${accounts.map(() => '?').join(', ')})
     ORDER BY u.email`,
    accounts.map((account) => account.email)
  );
  console.table(rows);
}

seedDemoPenaltyAccounts().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
