/**
 * Vercel serverless: POST /api/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies the payment signature from Razorpay
 */

const crypto = require("crypto");

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  let body;
  try {
    const raw = await readRequestBody(req);
    body = raw ? JSON.parse(raw) : {};
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment details" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ error: "Razorpay key secret not configured" });
  }

  try {
    // Verify signature — this proves the payment is real and from Razorpay
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Payment is verified and real
    return res.status(200).json({ success: true, payment_id: razorpay_payment_id });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Verification failed" });
  }
};
