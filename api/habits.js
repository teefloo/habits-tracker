const { getPool, ensureSchema } = require("./_lib/db");
const { handle, ok, error, readBody } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "POST") return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    if (!db) return error(res, 503, "Service indisponible pour le moment.");
    await ensureSchema();
    const user = await requireUser(db, req);

    const body = await readBody(req);
    const name = String(body.name || "").trim();
    if (!name) return error(res, 400, "Le nom de l'habitude est requis.");
    if (name.length > 60)
      return error(res, 400, "Le nom ne peut pas dépasser 60 caractères.");

    const { rows } = await db.query(
      "INSERT INTO habits (user_id, name) VALUES ($1, $2) RETURNING id, name",
      [user.id, name]
    );
    ok(res, { habit: rows[0] });
  });