const { getPool, ensureSchema } = require("../../_lib/db");
const { handle, noContent, error } = require("../../_lib/http");
const { requireUser } = require("../../_lib/auth");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

async function ownHabit(db, user, habitId) {
  const { rows } = await db.query(
    "SELECT id FROM habits WHERE id = $1 AND user_id = $2",
    [habitId, user.id]
  );
  return rows[0] ? true : false;
}

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "PUT" && req.method !== "DELETE")
      return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    if (!db) return error(res, 503, "Service indisponible pour le moment.");
    await ensureSchema();
    const user = await requireUser(db, req);

    const habitId = String(req.query.habitId || "");
    const day = String(req.query.date || "");
    if (!UUID_RE.test(habitId) || !validDate(day))
      return error(res, 404, "Coche introuvable.");
    if (!(await ownHabit(db, user, habitId)))
      return error(res, 404, "Coche introuvable.");

    if (req.method === "PUT") {
      await db.query(
        "INSERT INTO completions (user_id, habit_id, day) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [user.id, habitId, day]
      );
    } else {
      await db.query(
        "DELETE FROM completions WHERE user_id = $1 AND habit_id = $2 AND day = $3",
        [user.id, habitId, day]
      );
    }
    noContent(res);
  });
