import WebSocket, { WebSocketServer } from "ws";
import fetch from "node-fetch";

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log("AI Friend Signaling Server running on port", PORT);

function broadcastExcept(sender, msg) {
  wss.clients.forEach(c => {
    if (c !== sender && c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

function generateVisemes(text) {
  const vowels = text.match(/[aeiou]/gi) || [];
  const length = Math.min(Math.max(vowels.length / 3 + 3, 3), 18);
  const seq = [];
  let t = 0;

  for (let i = 0; i < length; i++) {
    seq.push({
      t: parseFloat(t.toFixed(2)),
      jaw: parseFloat((0.2 + Math.random() * 0.6).toFixed(2))
    });
    t += 0.12 + Math.random() * 0.2;
  }

  return seq;
}

function systemPrompt() {
  return `You are an empathetic AI friend who speaks casually like a real human.
You adapt to slang, emotion, and the user's language.
You behave friendly, supportive, and safe—like someone who cares deeply.
You NEVER give medical or legal diagnosis.
Keep responses short, warm, and natural (2–6 lines).`;
}

async function aiReply(userText) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return `${userText} (offline mode)`;

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: userText }
    ],
    temperature: 0.8
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "I'm here ❤️";
}

wss.on("connection", ws => {
  console.log("Client connected");

  ws.on("message", async msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    if (["offer", "answer", "ice"].includes(data.type)) {
      return broadcastExcept(ws, msg);
    }

    if (data.type === "stt_text") {
      const reply = await aiReply(data.text || "");
      const viseme = generateVisemes(reply);

      const out = {
        type: "ai_reply",
        text: reply,
        viseme
      };

      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(out));
        }
      });
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

console.log("Server ready.");
