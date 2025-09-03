import {
  users,
  customers,
  conversations,
  messages,
  bookings,
  channels,
  aiTraining,
  usage,
  bookingReminders,
  userReminderPreferences,
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
  type BookingReminder,
  type InsertBookingReminder,
  type UserReminderPreferences,
  type InsertUserReminderPreferences,
  scheduleSlots,
  type ScheduleSlot,
  type InsertScheduleSlot,
  specialAvailability,
  type SpecialAvailability,
  type InsertSpecialAvailability,
  bookingContexts,
  type BookingContext,
  type InsertBookingContext,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ne } from "drizzle-orm";

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
  getConversationById(id: string): Promise<Conversation | undefined>;
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

  // Reminder operations
  createBookingReminder(reminder: InsertBookingReminder): Promise<BookingReminder>;
  getBookingRemindersByUser(userId: string): Promise<BookingReminder[]>;
  getPendingReminders(): Promise<BookingReminder[]>;
  updateReminderStatus(id: string, status: string, sentAt?: Date, errorMessage?: string): Promise<void>;
  getUserReminderPreferences(userId: string): Promise<UserReminderPreferences | undefined>;
  upsertUserReminderPreferences(preferences: InsertUserReminderPreferences): Promise<UserReminderPreferences>;
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

  async getConversationById(id: string): Promise<Conversation | undefined> {
    return this.getConversation(id);
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
      config: config
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

    // Check if usage record exists for today
    const existingUsage = await this.getTodaysUsage(userId);
    
    if (existingUsage) {
      // Update existing record
      await db
        .update(usage)
        .set({
          tokensUsed: (existingUsage.tokensUsed || 0) + tokensUsed,
          messagesProcessed: (existingUsage.messagesProcessed || 0) + messagesProcessed,
          cost: (parseFloat(existingUsage.cost || '0') + parseFloat(cost)).toFixed(4),
        })
        .where(and(eq(usage.userId, userId), sql`DATE(${usage.date}) = DATE(${today})`));
    } else {
      // Create new record
      await db
        .insert(usage)
        .values({
          userId,
          date: today,
          tokensUsed,
          messagesProcessed,
          cost,
        });
    }
  }

  // Reminder operations
  async createBookingReminder(reminder: InsertBookingReminder): Promise<BookingReminder> {
    const [newReminder] = await db.insert(bookingReminders).values(reminder).returning();
    return newReminder;
  }

  async getBookingRemindersByUser(userId: string): Promise<BookingReminder[]> {
    return await db
      .select()
      .from(bookingReminders)
      .where(eq(bookingReminders.userId, userId))
      .orderBy(desc(bookingReminders.scheduledTime));
  }

  async getPendingReminders(): Promise<BookingReminder[]> {
    const now = new Date();
    return await db
      .select()
      .from(bookingReminders)
      .where(and(
        eq(bookingReminders.status, 'pending'),
        sql`${bookingReminders.scheduledTime} <= ${now}`
      ))
      .orderBy(bookingReminders.scheduledTime);
  }

  async updateReminderStatus(id: string, status: string, sentAt?: Date, errorMessage?: string): Promise<void> {
    await db
      .update(bookingReminders)
      .set({
        status,
        sentAt,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(bookingReminders.id, id));
  }

  async getUserReminderPreferences(userId: string): Promise<UserReminderPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userReminderPreferences)
      .where(eq(userReminderPreferences.userId, userId));
    return preferences;
  }

  async upsertUserReminderPreferences(preferences: InsertUserReminderPreferences): Promise<UserReminderPreferences> {
    const [result] = await db
      .insert(userReminderPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userReminderPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Schedule management methods
  async getScheduleSlots(userId: string): Promise<ScheduleSlot[]> {
    return await db.select().from(scheduleSlots).where(eq(scheduleSlots.userId, userId));
  }

  async createScheduleSlot(slot: InsertScheduleSlot): Promise<ScheduleSlot> {
    const [result] = await db.insert(scheduleSlots).values(slot).returning();
    return result;
  }

  async updateScheduleSlot(id: string, slot: Partial<InsertScheduleSlot>): Promise<ScheduleSlot> {
    const [result] = await db
      .update(scheduleSlots)
      .set({ ...slot, updatedAt: new Date() })
      .where(eq(scheduleSlots.id, id))
      .returning();
    return result;
  }

  async deleteScheduleSlot(id: string): Promise<void> {
    await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id));
  }

  // Special availability methods
  async getSpecialAvailability(userId: string): Promise<SpecialAvailability[]> {
    return await db.select().from(specialAvailability).where(eq(specialAvailability.userId, userId));
  }

  async createSpecialAvailability(special: InsertSpecialAvailability): Promise<SpecialAvailability> {
    const [result] = await db.insert(specialAvailability).values(special).returning();
    return result;
  }

  async deleteSpecialAvailability(id: string): Promise<void> {
    await db.delete(specialAvailability).where(eq(specialAvailability.id, id));
  }

  // Booking context methods
  async createBookingContext(context: InsertBookingContext): Promise<BookingContext> {
    const [result] = await db.insert(bookingContexts).values(context).returning();
    return result;
  }

  async getBookingContext(conversationId: string): Promise<BookingContext | undefined> {
    const [result] = await db.select().from(bookingContexts).where(eq(bookingContexts.conversationId, conversationId));
    return result;
  }

  async updateBookingContext(id: string, context: Partial<InsertBookingContext>): Promise<BookingContext> {
    const [result] = await db
      .update(bookingContexts)
      .set({ ...context, updatedAt: new Date() })
      .where(eq(bookingContexts.id, id))
      .returning();
    return result;
  }

  // Enhanced booking methods
  async updateBookingWithOwnerAction(id: string, action: string, comment?: string): Promise<Booking> {
    const [result] = await db
      .update(bookings)
      .set({ 
        ownerAction: action, 
        ownerComment: comment,
        status: action === 'approve' ? 'confirmed' : action === 'reject' ? 'cancelled' : 'pending',
        updatedAt: new Date() 
      })
      .where(eq(bookings.id, id))
      .returning();
    return result;
  }

  async getAvailableTimeSlots(userId: string, date: Date, duration: number = 30): Promise<{time: string, available: boolean}[]> {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    // Get regular schedule slots for this day
    const slots = await db.select().from(scheduleSlots)
      .where(and(
        eq(scheduleSlots.userId, userId),
        eq(scheduleSlots.dayOfWeek, dayOfWeek),
        eq(scheduleSlots.isAvailable, true)
      ));
    
    // Check for special availability/blackout for this date
    const special = await db.select().from(specialAvailability)
      .where(and(
        eq(specialAvailability.userId, userId),
        sql`DATE(${specialAvailability.date}) = ${dateStr}`
      ));
    
    // Get existing bookings for this date
    const existingBookings = await db.select().from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        sql`DATE(${bookings.dateTime}) = ${dateStr}`,
        ne(bookings.status, 'cancelled')
      ));
    
    const availableSlots: {time: string, available: boolean}[] = [];
    
    // If there's a blackout date, return no slots
    if (special.some(s => !s.isAvailable)) {
      return availableSlots;
    }
    
    // Generate time slots based on schedule
    for (const slot of slots) {
      const startHour = parseInt(slot.startTime.split(':')[0]);
      const startMin = parseInt(slot.startTime.split(':')[1]);
      const endHour = parseInt(slot.endTime.split(':')[0]);
      const endMin = parseInt(slot.endTime.split(':')[1]);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      for (let time = startTime; time < endTime; time += (slot.slotDuration || 30)) {
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // Check if this time slot conflicts with existing bookings
        const conflictingBookings = existingBookings.filter(booking => {
          if (!booking.dateTime) return false;
          const bookingTime = new Date(booking.dateTime);
          const bookingHour = bookingTime.getHours();
          const bookingMin = bookingTime.getMinutes();
          const bookingTimeInMin = bookingHour * 60 + bookingMin;
          
          return Math.abs(bookingTimeInMin - time) < duration;
        });
        
        const available = conflictingBookings.length < (slot.maxBookingsPerSlot || 1);
        
        availableSlots.push({ time: timeStr, available });
      }
    }
    
    return availableSlots.sort((a, b) => a.time.localeCompare(b.time));
  }
}

export const storage = new DatabaseStorage();
