import {
  users,
  customers,
  conversations,
  messages,
  bookings,
  channels,
  aiTraining,
  usage,
  type User,
  type UpsertUser,
  type InsertCustomer,
  type Customer,
  type InsertConversation,
  type Conversation,
  type InsertMessage,
  type Message,
  type InsertBooking,
  type Booking,
  type InsertChannel,
  type Channel,
  type InsertAiTraining,
  type AiTraining,
  type InsertUsage,
  type Usage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscriptionStatus(id: string, status: string, plan?: string): Promise<User>;
  updateUserAISettings(id: string, settings: { preferredLanguage?: string; aiPromptCustomization?: string; aiLanguageInstructions?: string; }): Promise<void>;

  // Customer operations
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomersByUser(userId: string): Promise<Customer[]>;
  getCustomerByIdentifier(userId: string, identifier: string, source: string): Promise<Customer | undefined>;
  getCustomerByTelegramId(userId: string, telegramChatId: string): Promise<Customer | undefined>;

  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  getActiveConversations(userId: string): Promise<Conversation[]>;
  getActiveConversationByCustomer(customerId: string): Promise<Conversation | undefined>;
  updateConversationStatus(id: string, status: string): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getTodaysBookings(userId: string): Promise<Booking[]>;
  updateBookingStatus(id: string, status: string): Promise<void>;

  // Channel operations
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannel(id: string): Promise<Channel | undefined>;
  getChannelsByUser(userId: string): Promise<Channel[]>;
  getChannelsByType(type: string): Promise<Channel[]>;
  updateChannelStatus(id: string, isActive: boolean): Promise<void>;
  updateChannelConfig(id: string, config: any): Promise<void>;

  // AI Training operations
  createAiTraining(training: InsertAiTraining): Promise<AiTraining>;
  getAiTrainingByUser(userId: string): Promise<AiTraining[]>;

  // Usage operations
  createUsage(usage: InsertUsage): Promise<Usage>;
  getTodaysUsage(userId: string): Promise<Usage | undefined>;
  updateUsage(userId: string, tokensUsed: number, messagesProcessed: number, cost: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscriptionStatus(id: string, status: string, plan?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserAISettings(id: string, settings: { preferredLanguage?: string; aiPromptCustomization?: string; aiLanguageInstructions?: string; }): Promise<void> {
    await db
      .update(users)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  // Customer operations
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomersByUser(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async getCustomerByIdentifier(userId: string, identifier: string, source: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.userId, userId),
          eq(customers.source, source),
          sql`${customers.email} = ${identifier} OR ${customers.phone} = ${identifier}`
        )
      );
    return customer;
  }

  async getCustomerByTelegramId(userId: string, telegramChatId: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.userId, userId),
          eq(customers.source, "telegram"),
          sql`${customers.metadata}->>'identifier' = ${telegramChatId}`
        )
      );
    return customer;
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getActiveConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.status, "active")))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getActiveConversationByCustomer(customerId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.customerId, customerId), eq(conversations.status, "active")))
      .orderBy(desc(conversations.lastMessageAt));
    return conversation;
  }

  async updateConversationStatus(id: string, status: string): Promise<void> {
    await db.update(conversations).set({ status }).where(eq(conversations.id, id));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update conversation's last message timestamp
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return newMessage;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async getTodaysBookings(userId: string): Promise<Booking[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          sql`${bookings.dateTime} >= ${today}`,
          sql`${bookings.dateTime} < ${tomorrow}`
        )
      )
      .orderBy(bookings.dateTime);
  }

  async updateBookingStatus(id: string, status: string): Promise<void> {
    await db.update(bookings).set({ status }).where(eq(bookings.id, id));
  }

  // Channel operations
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }

  async getChannelsByUser(userId: string): Promise<Channel[]> {
    return await db.select().from(channels).where(eq(channels.userId, userId));
  }

  async getChannelsByType(type: string): Promise<Channel[]> {
    return await db.select().from(channels).where(eq(channels.type, type));
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async updateChannelStatus(id: string, isActive: boolean): Promise<void> {
    await db.update(channels).set({ isActive }).where(eq(channels.id, id));
  }

  async updateChannelConfig(id: string, config: any): Promise<void> {
    await db.update(channels).set({ 
      config: config,
      updatedAt: new Date() 
    }).where(eq(channels.id, id));
  }

  // AI Training operations
  async createAiTraining(training: InsertAiTraining): Promise<AiTraining> {
    const [newTraining] = await db.insert(aiTraining).values(training).returning();
    return newTraining;
  }

  async getAiTrainingByUser(userId: string): Promise<AiTraining[]> {
    return await db
      .select()
      .from(aiTraining)
      .where(and(eq(aiTraining.userId, userId), eq(aiTraining.isActive, true)));
  }

  // Usage operations
  async createUsage(usageData: InsertUsage): Promise<Usage> {
    const [newUsage] = await db.insert(usage).values(usageData).returning();
    return newUsage;
  }

  async getTodaysUsage(userId: string): Promise<Usage | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select()
      .from(usage)
      .where(and(eq(usage.userId, userId), sql`DATE(${usage.date}) = DATE(${today})`));
    return result;
  }

  async updateUsage(userId: string, tokensUsed: number, messagesProcessed: number, cost: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db
      .insert(usage)
      .values({
        userId,
        date: today,
        tokensUsed,
        messagesProcessed,
        cost,
      })
      .onConflictDoUpdate({
        target: [usage.userId, usage.date],
        set: {
          tokensUsed: sql`${usage.tokensUsed} + ${tokensUsed}`,
          messagesProcessed: sql`${usage.messagesProcessed} + ${messagesProcessed}`,
          cost: sql`${usage.cost} + ${cost}`,
        },
      });
  }
}

export const storage = new DatabaseStorage();
