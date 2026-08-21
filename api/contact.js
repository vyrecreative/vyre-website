const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, limit) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, limit);
}

function validBusinessUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (error) {
    return false;
  }
}

module.exports = async function contactHandler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!String(request.headers["content-type"] || "").includes("application/json")) {
    return response.status(415).json({ error: "Use application/json." });
  }

  let body = request.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return response.status(400).json({ error: "Invalid request body." });
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response.status(400).json({ error: "Invalid request body." });
  }

  const email = clean(body.email, 254);
  const businessUrl = clean(body.businessUrl, 300);
  const goal = clean(body.goal, 500);
  const honeypot = clean(body.website, 120);
  const startedAt = Number(body.startedAt);
  const elapsed = Date.now() - startedAt;

  if (honeypot || !Number.isFinite(startedAt) || elapsed < 800 || elapsed > 86_400_000) {
    return response.status(400).json({ error: "Please reload the page and try again." });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return response.status(400).json({ error: "Enter a valid business email." });
  }

  if (!validBusinessUrl(businessUrl)) {
    return response.status(400).json({ error: "Enter a full website or social link beginning with http:// or https://." });
  }

  if (goal.length < 8) {
    return response.status(400).json({ error: "Tell us what should move first." });
  }

  const subject = encodeURIComponent("VYRE business inquiry");
  const message = encodeURIComponent(
    `My business email: ${email}\n\nBusiness link: ${businessUrl || "Not provided"}\n\nWhat should move first:\n${goal}`
  );

  return response.status(200).json({
    mailtoUrl: `mailto:officialvyrecreative@gmail.com?subject=${subject}&body=${message}`,
    stored: false
  });
};
