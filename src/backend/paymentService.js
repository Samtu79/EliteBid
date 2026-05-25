import { getDatabase } from './database';

export async function getPaymentMethods(clienteId) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT
      identificador AS id,
      tipo AS type,
      detalle AS detail,
      moneda AS currency,
      monto_garantia AS amount,
      verificado AS verified
     FROM medios_pago
     WHERE cliente = ?
     ORDER BY identificador DESC`,
    [clienteId]
  );

  return rows.map((row) => ({
    ...row,
    parsedDetail: parseDetail(row.detail)
  }));
}

export async function addPaymentMethod(clienteId, payload) {
  validatePayment(payload);

  const db = await getDatabase();
  const detail = JSON.stringify(buildPaymentDetail(payload));
  const verified = payload.type === 'cheque' ? 'no' : 'si';

  await db.runAsync(
    `INSERT INTO medios_pago (cliente, tipo, detalle, moneda, monto_garantia, verificado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clienteId, payload.type, detail, payload.currency, Number(payload.amount), verified]
  );

  const summary = await db.getFirstAsync(
    `SELECT COUNT(*) AS paymentCount
     FROM medios_pago
     WHERE cliente = ?`,
    [clienteId]
  );

  return summary?.paymentCount ?? 0;
}

function validatePayment(payload) {
  if (!payload.type) {
    throw new Error('Selecciona un tipo de medio de pago.');
  }

  if (Number(payload.amount || 0) <= 0) {
    throw new Error('Ingresa un monto de garantia mayor a cero.');
  }

  if (payload.type === 'tarjeta') {
    requireFields(payload, [
      ['cardNumber', 'Ingresa el numero de tarjeta.'],
      ['cardHolder', 'Ingresa el nombre del titular.'],
      ['expiry', 'Ingresa el vencimiento.'],
      ['cvv', 'Ingresa el CVV.']
    ]);
  }

  if (payload.type === 'cuenta') {
    requireFields(payload, [
      ['bank', 'Ingresa el banco.'],
      ['accountType', 'Ingresa el tipo de cuenta.'],
      ['cbu', 'Ingresa el CBU o CVU.'],
      ['alias', 'Ingresa el alias.']
    ]);
  }

  if (payload.type === 'cheque') {
    requireFields(payload, [
      ['bank', 'Ingresa el banco emisor.'],
      ['checkNumber', 'Ingresa el numero de cheque.'],
      ['issueDate', 'Ingresa la fecha de emision.'],
      ['checkImageUri', 'Carga una foto del cheque certificado.']
    ]);
  }
}

function requireFields(payload, fields) {
  for (const [key, message] of fields) {
    if (!String(payload[key] ?? '').trim()) {
      throw new Error(message);
    }
  }
}

function buildPaymentDetail(payload) {
  if (payload.type === 'tarjeta') {
    return {
      brand: detectCardBrand(payload.cardNumber),
      cardHolder: payload.cardHolder.trim(),
      cardNumberLast4: lastFour(payload.cardNumber),
      expiry: payload.expiry.trim()
    };
  }

  if (payload.type === 'cuenta') {
    return {
      bank: payload.bank.trim(),
      accountType: payload.accountType.trim(),
      cbuLast4: lastFour(payload.cbu),
      alias: payload.alias.trim()
    };
  }

  return {
    bank: payload.bank.trim(),
    checkNumberLast4: lastFour(payload.checkNumber),
    issueDate: payload.issueDate.trim(),
    checkImageUri: payload.checkImageUri.trim()
  };
}

function parseDetail(detail) {
  try {
    return JSON.parse(detail);
  } catch {
    const digits = String(detail).replace(/\D/g, '');

    return {
      label: detail,
      brand: detail,
      cardNumberLast4: digits.slice(-4),
      cbuLast4: digits.slice(-4),
      checkNumberLast4: digits.slice(-4)
    };
  }
}

function lastFour(value) {
  const digits = String(value).replace(/\D/g, '');
  return digits.slice(-4) || '0000';
}

function detectCardBrand(value) {
  const digits = String(value).replace(/\D/g, '');

  if (digits.startsWith('4')) return 'VISA';
  if (digits.startsWith('5')) return 'Mastercard';
  if (digits.startsWith('3')) return 'Amex';

  return 'Tarjeta';
}
