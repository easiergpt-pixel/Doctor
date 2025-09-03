import { storage } from "../storage";
import { generateAIResponse } from "./openai";

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: string;
}

async function sendTelegramMessage(botToken: string, message: TelegramMessage): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', response.status, errorText);
      return false;
    }

    console.log('Message sent to Telegram successfully');
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

export async function notifyCustomerOfBookingAction(
  bookingId: string, 
  action: string, 
  ownerComment?: string
): Promise<boolean> {
  try {
    console.log(`Notifying customer of booking action: ${action} for booking ${bookingId}`);
    
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }

    // Get customer details
    const customer = booking.customerId ? await storage.getCustomer(booking.customerId) : null;
    if (!customer) {
      console.error('Customer not found:', booking.customerId);
      return false;
    }

    // Get conversation details
    const conversation = booking.conversationId ? await storage.getConversation(booking.conversationId) : null;
    if (!conversation) {
      console.error('Conversation not found:', booking.conversationId);
      return false;
    }

    // Get channel configuration to determine how to send the message
    const channel = await storage.getChannel(conversation.channel);
    if (!channel) {
      console.error('Channel not found:', conversation.channel);
      return false;
    }

    // Only handle Telegram for now
    if (channel.type !== 'telegram') {
      console.log('Non-Telegram channel, skipping notification:', channel.type);
      return false;
    }

    // Get channel config for bot token
    const config = typeof channel.config === 'string' ? JSON.parse(channel.config) : (channel.config || {});
    const botToken = config.botToken;
    if (!botToken) {
      console.error('No bot token configured for Telegram channel');
      return false;
    }

    // Get customer's Telegram chat ID  
    const metadata = customer.metadata as any;
    const chatId = metadata?.identifier;
    if (!chatId) {
      console.error('No Telegram chat ID found for customer');
      return false;
    }

    // Generate AI response based on the owner action
    const aiPrompt = createBookingActionPrompt(booking, action, ownerComment);
    const conversationHistory = await storage.getMessagesByConversation(conversation.id);
    const chatHistory = conversationHistory.map(m => ({
      role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    const aiResponse = await generateAIResponse(
      booking.userId,
      aiPrompt,
      chatHistory,
      `Booking ${action} notification`
    );

    // Send the AI message to customer via Telegram
    const telegramMessage: TelegramMessage = {
      chat_id: chatId,
      text: aiResponse.message,
      parse_mode: 'HTML'
    };

    const sent = await sendTelegramMessage(botToken, telegramMessage);
    
    if (sent) {
      // Store the AI message in conversation history
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse.message,
        sender: 'ai',
        metadata: { 
          action: 'booking_notification', 
          ownerAction: action,
          bookingId: bookingId 
        },
      });

      // Update conversation last message time
      await storage.updateConversationStatus(conversation.id, 'active');

      console.log(`Successfully notified customer of ${action} action via Telegram`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error notifying customer of booking action:', error);
    return false;
  }
}

function createBookingActionPrompt(booking: any, action: string, ownerComment?: string): string {
  const serviceName = booking.service || 'appointment';
  const dateTime = booking.dateTime ? new Date(booking.dateTime).toLocaleString() : 'your requested time';
  
  switch (action) {
    case 'approve':
      return `The business owner has APPROVED your ${serviceName} booking for ${dateTime}. Please confirm this good news to the customer and provide any next steps or instructions.`;
    
    case 'reject':
      return `The business owner has REJECTED your ${serviceName} booking for ${dateTime}. ${ownerComment ? `Reason: ${ownerComment}` : ''} Please politely inform the customer and offer alternative solutions or times.`;
    
    case 'reschedule':
      return `The business owner needs to RESCHEDULE your ${serviceName} booking from ${dateTime}. ${ownerComment ? `Details: ${ownerComment}` : ''} Please inform the customer and help them find a new suitable time.`;
    
    default:
      return `There has been an update to your ${serviceName} booking. Please inform the customer about the status change.`;
  }
}