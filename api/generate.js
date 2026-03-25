/**
 * Vercel serverless: POST /api/generate
 * Body: { productName, productCategory, keyFeatures, targetCustomer, platform }
 */

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  let body;
  try {
    const raw = await readRequestBody(req);
    body = raw ? JSON.parse(raw) : {};
  } catch (e) {
    return res.status(500).json({ error: e.message || "Invalid JSON body" });
  }

  const {
    productName = "",
    productCategory = "",
    keyFeatures = "",
    targetCustomer = "",
    platform = "",
  } = body;

  const prompt =
    "You are an expert e-commerce copywriter.\n" +
    "Write a product listing for the following:\n" +
    `Product: ${productName}\n` +
    `Category: ${productCategory}\n` +
    `Key Features: ${keyFeatures}\n` +
    `Target Customer: ${targetCustomer}\n` +
    `Platform: ${platform}\n\n` +
    "Return exactly this format:\n" +
    "TITLE: (compelling product title, max 200 characters)\n\n" +
    "BULLET POINTS:\n" +
    "• (benefit-focused bullet point 1)\n" +
    "• (benefit-focused bullet point 2)\n" +
    "• (benefit-focused bullet point 3)\n" +
    "• (benefit-focused bullet point 4)\n" +
    "• (benefit-focused bullet point 5)\n\n" +
    "DESCRIPTION:\n" +
    "(2-3 paragraph full product description, SEO optimized)";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `OpenAI request failed with status ${response.status}`;
      return res.status(500).json({ error: message });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (text == null || text === "") {
      return res.status(500).json({ error: "OpenAI returned an empty response" });
    }

    return res.status(200).json({ result: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
