const { getPool, ensureSchema } = require("./_lib/db");
const { handle, json, error, readBody } = require("./_lib/http");
const { hashPassword, createSession, setSessionCookie, clientIp, allowRequest } =
  require("./_lib/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "POST") return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    if (!db) return error(res, 503, "Service indisponible pour le moment.");
    await ensureSchema();
    if (!allowRequest(`register:${clientIp(req)}`))
      return error(res, 429, "Trop de tentatives, réessayez plus tard.");

    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!EMAIL_RE.test(email))
      return error(res, 400, "Adresse email invalide.");
    if (password.length < 8)
      return error(res, 400, "Le mot de passe doit contenir au moins 8 caractères.");
    if (password.length > 200)
      return error(res, 400, "Mot de passe trop long.");

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, passwordHash]
    ).catch((err) => {
      if (err.code === "23505")
        throw Object.assign(new Error("Un compte existe déjà avec cet email."), { status: 409 });
      throw err;
    });

    const user = rows[0];
    const session = await createSession(db, user.id);
    setSessionCookie(res, session.token, session.expires);
    json(res, 201, { user: { id: user.id, email: user.email } });
  });
