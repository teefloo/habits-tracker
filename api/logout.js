const { getPool } = require("./_lib/db");
const { handle, ok, error } = require("./_lib/http");
const { parseCookies, deleteSession, clearSessionCookie } = require("./_lib/auth");

module.exports = (req, res) =>
  handle(req, res, async () => {
    if (req.method !== "POST") return error(res, 405, "Méthode non autorisée.");
    const db = getPool();
    const token = parseCookies(req.headers.cookie || "").session;
    await deleteSession(db, token);
    clearSessionCookie(res);
    ok(res, {});
  });