import OpenAI from "openai";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "",
});

function getLanguageInstructions(languageCode: string): string {
  const languages: Record<string, string> = {
    'en': 'Respond in English. Use professional business language.',
    'az': 'Azərbaycan dilində cavab verin. Hörmətli və peşəkar üslubu istifadə edin. Azərbaycan mədəniyyətinin xüsusiyyətlərini nəzərə alın.',
    'ru': 'Отвечайте на русском языке. Используйте вежливый и профессиональный стиль общения. Учитывайте культурные особенности.',
    'tr': 'Türkçe yanıt verin. Saygılı ve profesyonel bir üslup kullanın.',
    'es': 'Responde en español. Usa un lenguaje profesional y cortés.',
    'fr': 'Répondez en français. Utilisez un langage professionnel et poli.',
    'de': 'Antworten Sie auf Deutsch. Verwenden Sie eine professionelle und höfliche Sprache.',
    'pt': 'Responda em português. Use linguagem profissional e educada.',
    'ar': 'أجب باللغة العربية. استخدم لغة مهنية ومهذبة.',
  };
  
  return languages[languageCode] || languages['en'];
}

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
    console.log('=== STARTING AI RESPONSE GENERATION ===');
    console.log('User ID:', userId);
    console.log('Customer message:', customerMessage);
    
    // Get AI training data for this user
    console.log('Fetching training data...');
    const trainingData = await storage.getAiTrainingByUser(userId);
    console.log('Training data count:', trainingData.length);
    
    console.log('Fetching user data...');
    const user = await storage.getUser(userId);
    console.log('User language preference:', user?.preferredLanguage);

    const businessInfo = businessContext || `
      Business: ${user?.businessName || 'AI Receptionist Service'}
      Type: ${user?.businessType || 'Service Provider'}
    `;

    const trainingContext = trainingData.length > 0 
      ? trainingData.map(t => `${t.category}: ${t.content}`).join('\n')
      : 'General customer service for appointment booking and information requests.';

    // Language-specific instructions
    const languageInstructions = getLanguageInstructions(user?.preferredLanguage || 'en');
    
    // Build system prompt with language and custom instructions
    let systemPrompt = `IMPORTANT: IGNORE all previous generic responses in the conversation history. You are an AI receptionist for ${user?.businessName || 'the business'}. Your role is to:
1. Answer customer questions professionally and helpfully
2. Help customers book appointments when requested
3. Collect necessary information for bookings (name, service, preferred date/time, contact info)
4. Provide information about services, hours, and location
5. Escalate complex issues to human staff when needed

Business Context:
${businessInfo}

Training Data:
${trainingContext}

Language Instructions:
${languageInstructions}

${user?.aiPromptCustomization ? `Custom Instructions:\n${user.aiPromptCustomization}\n\n` : ''}

${user?.aiLanguageInstructions ? `Additional Language Guidelines:\n${user.aiLanguageInstructions}\n\n` : ''}

CRITICAL: You MUST respond with ONLY a valid JSON object in this exact format (no other text before or after):
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

    console.log('Sending request to OpenAI with messages:', JSON.stringify(messages, null, 2));
    
    console.log('Making OpenAI API call...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o instead of gpt-5 as it's more stable
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });
    
    console.log('OpenAI response received:', response.choices[0].message.content);
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      console.log('Parsed AI response:', aiResponse);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw response:', response.choices[0].message.content);
      
      // If JSON parsing fails, create a proper Azerbaijani response
      aiResponse = {
        message: user?.preferredLanguage === 'az' 
          ? "Salam! Sizə necə kömək edə bilərəm? Görüş təyin etmək üçün zəng edin və ya mesaj yazın."
          : "Hello! How can I assist you today? Please let me know if you'd like to book an appointment.",
        action: 'information',
        confidence: 0.7
      };
    }

    // Track token usage (temporarily disabled to fix database constraint issue)
    // const tokensUsed = response.usage?.total_tokens || 0;
    // const cost = (tokensUsed * 0.00003).toFixed(4); // Approximate cost per token
    // await storage.updateUsage(userId, tokensUsed, 1, cost);

    return {
      message: aiResponse.message || "I'm here to help! How can I assist you today?",
      action: aiResponse.action || 'information',
      bookingData: aiResponse.bookingData,
      confidence: aiResponse.confidence || 0.8,
    };

  } catch (error) {
    console.error("Error generating AI response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Return Azerbaijani fallback for your language preference
    return {
      message: "Üzr istəyirəm, texniki problemlər yaşayıram. Tezliklə sizə kömək edəcəyəm. Başqa bir sual varsa, yaza bilərsiniz.",
      action: 'information',
      confidence: 0.1,
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
      max_completion_tokens: 250,

    });

    return response.choices[0].message.content || "Business is performing well with steady customer engagement.";

  } catch (error) {
    console.error("Error generating business summary:", error);
    return "Unable to generate summary at this time.";
  }
}
