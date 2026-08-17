const { getPool, ensureSchema } = require("./_lib/db");
const { handle, ok, error } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "GET") return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    if (!db) return error(res, 503, "Service indisponible pour le moment.");
    await ensureSchema();
    const user = await requireUser(db, req);
    ok(res, { user: { id: user.id, email: user.email } });
  });