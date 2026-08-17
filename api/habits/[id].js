const { getPool, ensureSchema } = require("./_lib/db");
const { handle, noContent, error } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "DELETE") return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    if (!db) return error(res, 503, "Service indisponible pour le moment.");
    await ensureSchema();
    const user = await requireUser(db, req);

    const id = String(req.query.id || "");
    if (!UUID_RE.test(id)) return error(res, 404, "Habitude introuvable.");

    const result = await db.query(
      "DELETE FROM habits WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (result.rowCount === 0) return error(res, 404, "Habitude introuvable.");
    noContent(res);
  });