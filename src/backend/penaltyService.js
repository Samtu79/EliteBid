import { getDatabase } from './database';

export async function getUserPenalties(clienteId) {
  const db = await getDatabase();

  return db.getAllAsync(
    `SELECT
      identificador AS id,
      titulo AS title,
      descripcion AS description,
      importe AS amount,
      estado AS status,
      vencimiento AS dueDate,
      creado_en AS createdAt
     FROM penalidades
     WHERE cliente = ?
     ORDER BY
       CASE estado WHEN 'activa' THEN 0 WHEN 'vencida' THEN 1 ELSE 2 END,
       vencimiento ASC`,
    [clienteId]
  );
}
