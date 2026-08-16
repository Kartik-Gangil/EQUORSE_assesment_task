const Groq = require("groq-sdk");
const { config } = require("dotenv");
config()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


function extractCategory(rawText) {
    try {
        const parsed = JSON.parse(rawText);
        return parsed.category ?? null;
    } catch (err) {
        console.error("Failed to parse AI response:", rawText);
        return null;
    }
}


const AiProcessor = async (message) => {
    const chatCompletion = await getGroqChatCompletion(message);
    const category = extractCategory(chatCompletion.choices[0].message?.content);
    return category;
}


const System_Prompt = `You are a message classifier for a support system. Classify the user's message into exactly ONE of the following categories based on its meaning/intent:

SALES
BILLING
TECHNICAL
GENERAL

Rules:
- Respond with ONLY the single category word — no punctuation, no explanation, no extra text.
- The word must be exactly one of: SALES, BILLING, TECHNICAL, GENERAL (uppercase, exact match).
- SALES: pricing inquiries, plans, upgrades, demos, purchasing intent, new customer interest.
- BILLING: invoices, payments, refunds, subscription charges, billing disputes.
- TECHNICAL: bugs, errors, product not working, integration/setup issues, how-to on product features.
- GENERAL: anything that doesn't clearly fit the above, unclear intent, or mixed/ambiguous messages.
`


async function getGroqChatCompletion(message) {
    return groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: System_Prompt,
            },
            {
                role: "user",
                content: message,
            },
        ],
        temperature: 0,
        top_p: 1,
        model: "openai/gpt-oss-120b",
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "classification",
                schema: {
                    type: "object",
                    properties: {
                        category: {
                            type: "string",
                            enum: ["SALES", "BILLING", "TECHNICAL", "GENERAL"]
                        }
                    },
                    required: ["category"]
                }
            }
        }
    });
}
module.exports = AiProcessor
