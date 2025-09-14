import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function generateAIResponse(prompt: string, options?: { system?: string }) {
  // If no API key is present, keep a safe/dev fallback
  if (!apiKey) {
    return { content: `Echo: ${prompt}` };
  }

  try {
    const client = new OpenAI({ apiKey });
    const system =
      options?.system ||
      "You are an AI receptionist helping businesses answer customer questions and manage bookings. Be concise, helpful, and professional.";

    const completion = await client.chat.completions.create({
      model: defaultModel,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    return { content };
  } catch (err) {
    // Non-fatal: fall back to echo in local/dev so UX continues to work
    console.warn("OpenAI error, falling back to echo:", err);
    return { content: `Echo: ${prompt}` };
  }
}
