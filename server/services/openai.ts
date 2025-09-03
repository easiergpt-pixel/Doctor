import OpenAI from "openai";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "",
});

export interface AIResponse {
  message: string;
  action?: 'booking' | 'information' | 'handoff';
  bookingData?: {
    service: string;
    preferredDateTime?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  };
  confidence: number;
}

export async function generateAIResponse(
  userId: string,
  customerMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  businessContext?: string
): Promise<AIResponse> {
  try {
    // Get AI training data for this user
    const trainingData = await storage.getAiTrainingByUser(userId);
    const user = await storage.getUser(userId);

    const businessInfo = businessContext || `
      Business: ${user?.businessName || 'AI Receptionist Service'}
      Type: ${user?.businessType || 'Service Provider'}
    `;

    const trainingContext = trainingData.length > 0 
      ? trainingData.map(t => `${t.category}: ${t.content}`).join('\n')
      : 'General customer service for appointment booking and information requests.';

    const systemPrompt = `You are an AI receptionist for ${user?.businessName || 'the business'}. Your role is to:
1. Answer customer questions professionally and helpfully
2. Help customers book appointments when requested
3. Collect necessary information for bookings (name, service, preferred date/time, contact info)
4. Provide information about services, hours, and location
5. Escalate complex issues to human staff when needed

Business Context:
${businessInfo}

Training Data:
${trainingContext}

When responding, always provide a JSON response with this format:
{
  "message": "Your response to the customer",
  "action": "booking|information|handoff",
  "bookingData": {
    "service": "service name if booking",
    "preferredDateTime": "if customer specified",
    "customerName": "if provided",
    "customerPhone": "if provided", 
    "customerEmail": "if provided"
  },
  "confidence": 0.95
}

Guidelines:
- Be friendly, professional, and helpful
- Keep responses concise but informative
- Always try to help with booking requests
- Ask for missing information needed for bookings
- Use "handoff" action only for complex issues requiring human intervention
- Set confidence based on how well you understand the request (0.0 to 1.0)`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: customerMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || '{}');

    // Track token usage
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = (tokensUsed * 0.00003).toFixed(4); // Approximate cost per token
    
    await storage.updateUsage(userId, tokensUsed, 1, cost);

    return {
      message: aiResponse.message || "I'm here to help! How can I assist you today?",
      action: aiResponse.action || 'information',
      bookingData: aiResponse.bookingData,
      confidence: aiResponse.confidence || 0.8,
    };

  } catch (error) {
    console.error("Error generating AI response:", error);
    
    // Fallback response
    return {
      message: "I apologize, but I'm experiencing some technical difficulties. A team member will assist you shortly.",
      action: 'handoff',
      confidence: 0.0,
    };
  }
}

export async function generateBusinessSummary(userId: string, timeframe: string = '30d'): Promise<string> {
  try {
    const conversations = await storage.getConversationsByUser(userId);
    const bookings = await storage.getBookingsByUser(userId);
    
    const conversationCount = conversations.length;
    const bookingCount = bookings.filter(b => b.status === 'confirmed').length;
    
    const prompt = `Generate a brief business summary for an AI receptionist service with:
- ${conversationCount} conversations in the last ${timeframe}
- ${bookingCount} confirmed bookings
- Focus on key insights and recommendations for improvement
- Keep it under 200 words
- Format as friendly business advice`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Business is performing well with steady customer engagement.";

  } catch (error) {
    console.error("Error generating business summary:", error);
    return "Unable to generate summary at this time.";
  }
}
