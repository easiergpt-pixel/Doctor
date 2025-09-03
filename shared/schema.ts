import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  businessName: varchar("business_name"),
  businessType: varchar("business_type"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"),
  // AI and Language Settings
  preferredLanguage: varchar("preferred_language").default("en"), // en, az, ru, etc.
  aiPromptCustomization: text("ai_prompt_customization"), // custom system prompt
  aiLanguageInstructions: text("ai_language_instructions"), // language-specific instructions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table for CRM
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name"),
  email: varchar("email"),
  phone: varchar("phone"),
  source: varchar("source"), // whatsapp, messenger, website, etc.
  metadata: jsonb("metadata"), // additional customer data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  channel: varchar("channel").notNull(), // whatsapp, messenger, website, etc.
  status: varchar("status").default("active"), // active, closed, pending
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  sender: varchar("sender").notNull(), // customer, ai, agent
  metadata: jsonb("metadata"), // additional message data
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  service: varchar("service"),
  dateTime: timestamp("date_time"),
  status: varchar("status").default("pending"), // pending, confirmed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Channels table for integration management
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // whatsapp, messenger, website, instagram
  name: varchar("name").notNull(),
  config: jsonb("config"), // channel-specific configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Training data
export const aiTraining = pgTable("ai_training", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  category: varchar("category"), // faq, services, policies, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage tracking for billing
export const usage = pgTable("usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow(),
  tokensUsed: integer("tokens_used").default(0),
  messagesProcessed: integer("messages_processed").default(0),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0.00"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  conversations: many(conversations),
  bookings: many(bookings),
  channels: many(channels),
  aiTraining: many(aiTraining),
  usage: many(usage),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  conversations: many(conversations),
  bookings: many(bookings),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  customer: one(customers, { fields: [conversations.customerId], references: [customers.id] }),
  messages: many(messages),
  bookings: many(bookings),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  conversation: one(conversations, { fields: [bookings.conversationId], references: [conversations.id] }),
}));

export const channelsRelations = relations(channels, ({ one }) => ({
  user: one(users, { fields: [channels.userId], references: [users.id] }),
}));

export const aiTrainingRelations = relations(aiTraining, ({ one }) => ({
  user: one(users, { fields: [aiTraining.userId], references: [users.id] }),
}));

export const usageRelations = relations(usage, ({ one }) => ({
  user: one(users, { fields: [usage.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertAiTrainingSchema = createInsertSchema(aiTraining).omit({
  id: true,
  createdAt: true,
});

export const insertUsageSchema = createInsertSchema(usage).omit({
  id: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Booking reminders table
export const bookingReminders = pgTable("booking_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reminderType: varchar("reminder_type").notNull(), // 'email', 'sms', 'whatsapp'
  scheduledTime: timestamp("scheduled_time").notNull(),
  messageContent: text("message_content").notNull(),
  status: varchar("status").default("pending").notNull(), // 'pending', 'sent', 'failed', 'cancelled'
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User reminder preferences
export const userReminderPreferences = pgTable("user_reminder_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  emailReminders: boolean("email_reminders").default(true).notNull(),
  smsReminders: boolean("sms_reminders").default(false).notNull(),
  whatsappReminders: boolean("whatsapp_reminders").default(false).notNull(),
  reminderTiming: jsonb("reminder_timing").default(sql`'["24h", "1h"]'::jsonb`).notNull(), // Array of timing like "24h", "1h", "30min"
  customMessage: text("custom_message"),
  language: varchar("language").default("en").notNull(), // 'en', 'az', 'ru'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BookingReminder = typeof bookingReminders.$inferSelect;
export type InsertBookingReminder = typeof bookingReminders.$inferInsert;
export type UserReminderPreferences = typeof userReminderPreferences.$inferSelect;
export type InsertUserReminderPreferences = typeof userReminderPreferences.$inferInsert;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertAiTraining = z.infer<typeof insertAiTrainingSchema>;
export type AiTraining = typeof aiTraining.$inferSelect;
export type InsertUsage = z.infer<typeof insertUsageSchema>;
export type Usage = typeof usage.$inferSelect;
