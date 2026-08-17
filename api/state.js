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

    const { rows: habits } = await db.query(
      "SELECT id, name FROM habits WHERE user_id = $1 ORDER BY created_at",
      [user.id]
    );

    const { rows: completions } = await db.query(
      "SELECT habit_id, to_char(day, 'YYYY-MM-DD') AS day FROM completions WHERE user_id = $1",
      [user.id]
    );

    const completionMap = {};
    for (const c of completions) completionMap[`${c.day}|${c.habit_id}`] = true;

    ok(res, { habits, completions: completionMap });
  });