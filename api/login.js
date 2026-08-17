const { getPool, ensureSchema } = require("./_lib/db");
const { handle, ok, error, readBody } = require("./_lib/http");
const {
  verifyPassword, createSession, setSessionCookie, clientIp, allowRequest,
} = require("./_lib/auth");

const GENERIC = "Email ou mot de passe incorrect.";

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "POST") return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    if (!db) return error(res, 503, "Service indisponible pour le moment.");
    await ensureSchema();
    if (!allowRequest(`login:${clientIp(req)}`))
      return error(res, 429, "Trop de tentatives, réessayez plus tard.");

    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const { rows } = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    const user = rows[0];
    const valid = await verifyPassword(password, user ? user.password_hash : "invalid");
    if (!user || !valid) return error(res, 401, GENERIC);

    const session = await createSession(db, user.id);
    setSessionCookie(res, session.token, session.expires);
    ok(res, { user: { id: user.id, email: user.email } });
  });