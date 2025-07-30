const express = require("express");
const cors = require("cors");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Limit each IP to 5 requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: {
    error: "Too many requests from this IP. Please try again in a minute.",
  },
});
app.use("/analyze", limiter); // Apply to only the /analyze endpoint

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

app.post("/analyze", async (req, res) => {
  const { emailText } = req.body;
  if (!emailText) {
    return res.status(400).json({ error: "Missing emailText" });
  }

  const prompt = `
Analyze the following email for phishing or scam indicators. Point out suspicious phrases, sender behavior, links, and tone.

Then give a final trust score from 0 to 100 — where 0 is a guaranteed phishing email and 100 is completely safe.

Format your response like this exactly:

Summary:
[your short analysis here]

Trust Score: [number from 0 to 100]

Email:
${emailText.slice(0, 8000)}
`;

  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a cybersecurity assistant trained to detect phishing emails.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("AI request failed:", err.response?.data || err.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`📡 AI Proxy listening on http://localhost:${port}`)
);