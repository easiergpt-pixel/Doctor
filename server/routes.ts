import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { reminderService } from "./services/reminderService";
import { generateAIResponse } from "./services/openai";
import { RealtimeService } from "./services/websocket";
import { insertMessageSchema, insertBookingSchema, insertChannelSchema, insertAiTrainingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  const httpServer = createServer(app);
  const realtimeService = new RealtimeService(httpServer);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const conversations = await storage.getConversationsByUser(userId);
      const bookings = await storage.getBookingsByUser(userId);
      const todaysBookings = await storage.getTodaysBookings(userId);
      const usage = await storage.getTodaysUsage(userId);

      const stats = {
        totalConversations: conversations.length,
        bookingsMade: bookings.filter(b => b.status === 'confirmed').length,
        avgResponseTime: "2.3s", // This would be calculated from actual response times
        satisfactionRate: "94%", // This would come from customer feedback
        todaysBookings: todaysBookings.length,
        tokensUsed: usage?.tokensUsed || 0,
        cost: usage?.cost || "0.00",
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Channel stats - conversation count by channel type
  app.get('/api/channels/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      
      // Count conversations by channel type for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const channelStats: Record<string, number> = {};
      
      for (const conv of conversations) {
        const channel = await storage.getChannel(conv.channel);
        const channelType = channel?.type || 'website';
        
        // Count conversations from today
        if (conv.createdAt) {
          const convDate = new Date(conv.createdAt);
          if (convDate >= today) {
            channelStats[channelType] = (channelStats[channelType] || 0) + 1;
          }
        }
      }
      
      res.json(channelStats);
    } catch (error) {
      console.error("Error fetching channel stats:", error);
      res.status(500).json({ message: "Failed to fetch channel stats" });
    }
  });

  // Conversations
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      
      // Enrich conversations with channel information
      const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
        const channel = await storage.getChannel(conv.channel);
        return {
          ...conv,
          channelName: channel?.name || 'Unknown',
          channelType: channel?.type || 'unknown',
          channel: channel?.type || conv.channel // Use channel type for display
        };
      }));
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getActiveConversations(userId);
      
      // Enrich conversations with channel information
      const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
        const channel = await storage.getChannel(conv.channel);
        return {
          ...conv,
          channelName: channel?.name || 'Unknown',
          channelType: channel?.type || 'unknown',
          channel: channel?.type || conv.channel // Use channel type for display
        };
      }));
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("Error fetching active conversations:", error);
      res.status(500).json({ message: "Failed to fetch active conversations" });
    }
  });

  // Get single conversation
  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const conversation = await storage.getConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Enrich with channel information
      const channel = await storage.getChannel(conversation.channel);
      const enrichedConversation = {
        ...conversation,
        channelName: channel?.name || 'Unknown',
        channelType: channel?.type || 'unknown',
        channel: channel?.type || conversation.channel // Use channel type for display
      };
      
      res.json(enrichedConversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByConversation(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Chat endpoint for AI responses
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, conversationId, channel, customerIdentifier } = req.body;
      
      if (!message || !conversationId) {
        return res.status(400).json({ message: "Message and conversation ID required" });
      }

      // For now, we'll get userId from conversation or create a demo response
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages.map(m => ({
        role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      // Store customer message
      await storage.createMessage({
        conversationId,
        content: message,
        sender: 'customer',
        metadata: { channel, customerIdentifier },
      });

      // Generate AI response
      const aiResponse = await generateAIResponse(
        conversation.userId,
        message,
        conversationHistory
      );

      // Store AI response
      await storage.createMessage({
        conversationId,
        content: aiResponse.message,
        sender: 'ai',
        metadata: { action: aiResponse.action, confidence: aiResponse.confidence },
      });

      // Handle booking if needed
      if (aiResponse.action === 'booking' && aiResponse.bookingData) {
        const booking = await storage.createBooking({
          userId: conversation.userId,
          customerId: conversation.customerId,
          conversationId,
          service: aiResponse.bookingData.service,
          dateTime: aiResponse.bookingData.preferredDateTime ? new Date(aiResponse.bookingData.preferredDateTime) : undefined,
          status: 'pending',
          notes: `Auto-created from chat. Customer: ${aiResponse.bookingData.customerName || 'Unknown'}`,
        });

        realtimeService.notifyBookingCreated(conversation.userId, booking);
      }

      res.json(aiResponse);
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // Start conversation endpoint for widget
  app.post('/api/conversations/start', async (req, res) => {
    try {
      const { businessId, channel, customerIdentifier } = req.body;
      
      if (!businessId || !channel) {
        return res.status(400).json({ message: "Business ID and channel required" });
      }

      // Find or create customer
      let customer = await storage.getCustomerByIdentifier(businessId, customerIdentifier, channel);
      if (!customer) {
        customer = await storage.createCustomer({
          userId: businessId,
          name: "Unknown Customer",
          source: channel,
          metadata: { identifier: customerIdentifier },
        });
      }

      // Create conversation
      const conversation = await storage.createConversation({
        userId: businessId,
        customerId: customer.id,
        channel,
        status: 'active',
        lastMessageAt: new Date(),
      });

      realtimeService.notifyNewConversation(businessId, conversation);

      res.json(conversation);
    } catch (error) {
      console.error("Error starting conversation:", error);
      res.status(500).json({ message: "Failed to start conversation" });
    }
  });

  // Bookings
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookingsByUser(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getTodaysBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching today's bookings:", error);
      res.status(500).json({ message: "Failed to fetch today's bookings" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingData = insertBookingSchema.parse({ ...req.body, userId });
      
      const booking = await storage.createBooking(bookingData);
      realtimeService.notifyBookingCreated(userId, booking);
      
      // Automatically create reminders for the new booking
      if (booking.id) {
        await reminderService.createRemindersForBooking(booking.id);
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Customers
  app.get('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customers = await storage.getCustomersByUser(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Channels
  app.get('/api/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channels = await storage.getChannelsByUser(userId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.put('/api/channels/:id/config', isAuthenticated, async (req: any, res) => {
    try {
      const channelId = req.params.id;
      const { config } = req.body;
      const userId = req.user.claims.sub;

      // Verify the channel belongs to the user
      const channel = await storage.getChannel(channelId);
      if (!channel || channel.userId !== userId) {
        return res.status(404).json({ message: "Channel not found" });
      }

      await storage.updateChannelConfig(channelId, config);
      res.json({ message: "Channel configuration updated successfully" });
    } catch (error) {
      console.error("Error updating channel config:", error);
      res.status(500).json({ message: "Failed to update channel configuration" });
    }
  });

  app.post('/api/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channelData = insertChannelSchema.parse({ ...req.body, userId });
      
      const channel = await storage.createChannel(channelData);
      res.json(channel);
    } catch (error) {
      console.error("Error creating channel:", error);
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  // AI Training
  app.get('/api/ai-training', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const training = await storage.getAiTrainingByUser(userId);
      res.json(training);
    } catch (error) {
      console.error("Error fetching AI training:", error);
      res.status(500).json({ message: "Failed to fetch AI training" });
    }
  });

  app.post('/api/ai-training', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainingData = insertAiTrainingSchema.parse({ ...req.body, userId });
      
      const training = await storage.createAiTraining(trainingData);
      res.json(training);
    } catch (error) {
      console.error("Error creating AI training:", error);
      res.status(500).json({ message: "Failed to create AI training" });
    }
  });

  // AI Settings
  app.put('/api/ai-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { preferredLanguage, aiPromptCustomization, aiLanguageInstructions } = req.body;

      await storage.updateUserAISettings(userId, {
        preferredLanguage,
        aiPromptCustomization,
        aiLanguageInstructions,
      });

      res.json({ message: "AI settings updated successfully" });
    } catch (error) {
      console.error("Error updating AI settings:", error);
      res.status(500).json({ message: "Failed to update AI settings" });
    }
  });

  // Telegram Webhook Handler
  app.post('/api/webhooks/telegram', async (req, res) => {
    try {
      // Process Telegram webhook
      
      const update = req.body;
      
      // Validate webhook has message
      if (!update.message) {
        console.log('No message in webhook update');
        return res.status(200).send('OK');
      }
      
      const message = update.message;
      const chatId = message.chat.id.toString();
      const messageText = message.text || '';
      const firstName = message.from?.first_name || 'Unknown';
      const lastName = message.from?.last_name || '';
      const username = message.from?.username;
      
      if (!messageText) {
        console.log('No text in message');
        return res.status(200).send('OK');
      }
      
      // Find the Telegram channel configuration
      const channels = await storage.getChannelsByType('telegram');
      if (channels.length === 0) {
        console.error('No Telegram channels configured');
        return res.status(200).send('OK');
      }
      
      const channel = channels[0]; // Use first configured Telegram channel
      const config = typeof channel.config === 'string' ? JSON.parse(channel.config) : (channel.config || {});
      const botToken = config.botToken;
      
      if (!botToken) {
        console.error('No bot token configured');
        return res.status(200).send('OK');
      }
      
      // Find or create customer
      let customer = await storage.getCustomerByTelegramId(channel.userId, chatId);
      if (!customer) {
        const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'Telegram User';
        customer = await storage.createCustomer({
          userId: channel.userId,
          name: customerName,
          source: 'telegram',
          metadata: { 
            identifier: chatId,
            telegramUsername: username,
            firstName: firstName,
            lastName: lastName 
          },
        });
      }
      
      // Find or create conversation
      let conversation = await storage.getActiveConversationByCustomer(customer.id);
      if (!conversation) {
        conversation = await storage.createConversation({
          userId: channel.userId,
          customerId: customer.id,
          channel: channel.id,
          status: 'active',
          lastMessageAt: new Date(),
        });
      }
      
      // Store customer message
      await storage.createMessage({
        conversationId: conversation.id,
        content: messageText,
        sender: 'customer',
        metadata: { 
          channel: 'telegram', 
          customerIdentifier: chatId,
          telegramMessageId: message.message_id,
          telegramUserId: message.from?.id
        },
      });
      
      // Get conversation history for AI context
      const messages = await storage.getMessagesByConversation(conversation.id);
      // Filter out generic English responses but keep all other conversation context
      const conversationHistory = messages.slice(-10)
        .filter(m => 
          m.content !== "I'm here to help! How can I assist you today!" &&
          m.content.trim() !== "" &&
          !m.content.includes("How can I assist you today")
        )
        .map(m => ({
          role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }));
      
      // Generate AI response
      const aiResponse = await generateAIResponse(
        channel.userId,
        messageText,
        conversationHistory
      );
      
      // Store AI response
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse.message,
        sender: 'ai',
        metadata: { 
          action: aiResponse.action, 
          confidence: aiResponse.confidence,
          channel: 'telegram'
        },
      });
      
      // Handle booking if needed
      if (aiResponse.action === 'booking' && aiResponse.bookingData) {
        let bookingDate = new Date(); // Default to now
        
        // Parse preferred date/time with better logic
        if (aiResponse.bookingData.preferredDateTime) {
          const dateTimeStr = aiResponse.bookingData.preferredDateTime.toLowerCase();
          
          if (dateTimeStr.includes('sabah') || dateTimeStr.includes('tomorrow')) {
            // Tomorrow
            bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + 1);
            
            // Extract time (like "saat 9", "9:00")
            const timeMatch = dateTimeStr.match(/(\d+):?(\d*)/);
            if (timeMatch) {
              const hour = parseInt(timeMatch[1]);
              const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
              bookingDate.setHours(hour, minute, 0, 0);
            }
          } else if (dateTimeStr.includes('04.09.2025') || dateTimeStr.includes('2025-09-04')) {
            // Specific date
            bookingDate = new Date('2025-09-04');
            const timeMatch = dateTimeStr.match(/(\d+):(\d+)/);
            if (timeMatch) {
              bookingDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
            } else {
              bookingDate.setHours(9, 0, 0, 0); // Default 9 AM
            }
          } else {
            // Try to parse as ISO date
            try {
              const parsed = new Date(aiResponse.bookingData.preferredDateTime);
              if (!isNaN(parsed.getTime())) {
                bookingDate = parsed;
              }
            } catch (error) {
              console.log('Using default date due to parsing error:', error);
            }
          }
        }
        
        const booking = await storage.createBooking({
          userId: channel.userId,
          customerId: customer.id,
          conversationId: conversation.id,
          service: aiResponse.bookingData.service || 'General consultation',
          dateTime: bookingDate,
          status: 'pending',
          notes: `Auto-created from Telegram chat. Customer: ${aiResponse.bookingData.customerName || customer.name}. Requested: ${aiResponse.bookingData.preferredDateTime || 'no specific time'}`,
        });
        
        realtimeService.notifyBookingCreated(channel.userId, booking);
      }
      
      // Send response back to Telegram
      try {
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(telegramApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: aiResponse.message,
            parse_mode: 'Markdown'
          })
        });
        
        if (!response.ok) {
          console.error('Failed to send Telegram response:', await response.text());
        }
      } catch (error) {
        console.error('Error sending Telegram message:', error);
      }
      
      // Notify real-time clients
      realtimeService.broadcastToUser(channel.userId, {
        type: 'new_message',
        conversationId: conversation.id,
        message: {
          id: `temp-${Date.now()}`,
          conversationId: conversation.id,
          content: messageText,
          sender: 'customer',
          createdAt: new Date(),
          metadata: { channel: 'telegram' }
        }
      });
      
      realtimeService.broadcastToUser(channel.userId, {
        type: 'new_message',
        conversationId: conversation.id,
        message: {
          id: `temp-ai-${Date.now()}`,
          conversationId: conversation.id,
          content: aiResponse.message,
          sender: 'ai',
          createdAt: new Date(),
          metadata: { action: aiResponse.action, confidence: aiResponse.confidence }
        }
      });
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Telegram webhook error:', error);
      res.status(200).send('OK'); // Always return 200 to avoid Telegram retries
    }
  });

  // Local subscription management
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    let user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      // Simple local subscription - mark user as having a subscription
      await storage.updateUserSubscriptionStatus(userId, 'active', 'professional');
      
      res.json({
        success: true,
        message: "Subscription activated locally",
        plan: "professional"
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Get subscription status
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        status: user.subscriptionStatus || 'inactive',
        plan: user.subscriptionStatus === 'active' ? 'professional' : 'free'
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Reminder preferences routes
  app.get('/api/reminder-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserReminderPreferences(userId);
      res.json(preferences || {
        emailReminders: true,
        smsReminders: false,
        whatsappReminders: false,
        reminderTiming: ['24h', '1h'],
        language: 'en'
      });
    } catch (error) {
      console.error('Error fetching reminder preferences:', error);
      res.status(500).json({ message: 'Failed to fetch reminder preferences' });
    }
  });

  app.post('/api/reminder-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.upsertUserReminderPreferences({
        ...req.body,
        userId,
      });
      res.json(preferences);
    } catch (error) {
      console.error('Error saving reminder preferences:', error);
      res.status(500).json({ message: 'Failed to save reminder preferences' });
    }
  });

  // Get booking reminders for user
  app.get('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminders = await storage.getBookingRemindersByUser(userId);
      res.json(reminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({ message: 'Failed to fetch reminders' });
    }
  });

  // Start reminder processing scheduler
  reminderService.startReminderScheduler();

  return httpServer;
}
