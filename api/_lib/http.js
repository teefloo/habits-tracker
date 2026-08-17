function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function noContent(res) {
  res.statusCode = 204;
  res.end();
}

function ok(res, body) {
  json(res, 200, body);
}

function error(res, status, message) {
  json(res, status, { error: message });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function readBody(req, limit = 10000) {
  return new Promise((resolve, reject) => {
    let data = "";
    let done = false;
    req.on("data", (chunk) => {
      if (done) return;
      data += chunk;
      if (data.length > limit) {
        done = true;
        reject(httpError(400, "Requête invalide."));
      }
    });
    req.on("end", () => {
      if (done) return;
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(httpError(400, "Requête invalide."));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

async function handle(req, res, route) {
  try {
    await route(req, res);
  } catch (err) {
    if (err && err.status) return error(res, err.status, err.message);
    console.error("Erreur interne :", err);
    error(res, 500, "Erreur interne.");
  }
}

module.exports = { json, noContent, ok, error, httpError, readBody, handle };