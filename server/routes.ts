import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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

  // Conversations
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getActiveConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching active conversations:", error);
      res.status(500).json({ message: "Failed to fetch active conversations" });
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

  return httpServer;
}
