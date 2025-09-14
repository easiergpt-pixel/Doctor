import { z } from "zod";
export const insertMessageSchema = z.object({ content: z.string().optional() });
export const insertBookingSchema = z.object({
  customerId: z.string().optional(),
  startsAt: z.string().optional(),
});
export const insertChannelSchema = z.object({ name: z.string().optional() });
export const insertAiTrainingSchema = z.object({ prompt: z.string().optional() });
