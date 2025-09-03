import { storage } from "../storage";
import { format, subHours, subMinutes } from "date-fns";
import { generateAIResponse } from "./openai";

export class ReminderService {
  // Parse timing string to hours/minutes before appointment
  private parseReminderTiming(timing: string): { hours: number; minutes: number } {
    if (timing.includes('h')) {
      const hours = parseInt(timing.replace('h', ''));
      return { hours, minutes: 0 };
    } else if (timing.includes('min')) {
      const minutes = parseInt(timing.replace('min', ''));
      return { hours: 0, minutes };
    } else if (timing.includes('d')) {
      const days = parseInt(timing.replace('d', ''));
      return { hours: days * 24, minutes: 0 };
    }
    // Default to 1 hour
    return { hours: 1, minutes: 0 };
  }

  // Calculate when reminder should be sent
  private calculateReminderTime(appointmentTime: Date, timing: string): Date {
    const { hours, minutes } = this.parseReminderTiming(timing);
    
    if (minutes > 0) {
      return subMinutes(appointmentTime, minutes);
    } else {
      return subHours(appointmentTime, hours);
    }
  }

  // Generate personalized reminder message using AI
  private async generateReminderMessage(
    booking: any,
    customer: any,
    preferences: any,
    reminderType: string
  ): Promise<string> {
    const language = preferences.language || 'en';
    const customMessage = preferences.customMessage;
    
    // Language-specific prompts
    const languagePrompts: Record<string, string> = {
      'en': 'Generate a friendly appointment reminder in English',
      'az': 'Generate a friendly appointment reminder in Azerbaijani',
      'ru': 'Generate a friendly appointment reminder in Russian'
    };

    const appointmentTime = format(new Date(booking.dateTime), 'PPpp');
    
    const prompt = `${languagePrompts[language] || languagePrompts['en']} for:
    Customer: ${customer?.name || 'Valued Customer'}
    Service: ${booking.service || 'Appointment'}
    Date & Time: ${appointmentTime}
    ${customMessage ? `Custom message to include: ${customMessage}` : ''}
    
    Make it warm, professional, and include:
    - Greeting with customer name
    - Appointment details (service, date, time)  
    - Any preparation instructions if relevant
    - Contact info for changes
    ${customMessage ? '- Custom message from business' : ''}
    
    Keep it concise for ${reminderType} delivery.`;

    try {
      const response = await generateAIResponse(prompt, booking.userId, 'en'); // System prompt in EN, content in target language
      return response;
    } catch (error) {
      console.error('Error generating reminder message:', error);
      
      // Fallback messages by language
      const fallbackMessages: Record<string, string> = {
        'en': `Hello ${customer?.name || 'there'}! This is a reminder about your ${booking.service || 'appointment'} scheduled for ${appointmentTime}. Please contact us if you need to make any changes.`,
        'az': `Salam ${customer?.name || 'hörmətli müştəri'}! Bu ${booking.service || 'görüş'} üçün ${appointmentTime} tarixinə təyin olunmuş xatırlatmadır. Dəyişiklik etmək lazım olsa, bizimlə əlaqə saxlayın.`,
        'ru': `Привет ${customer?.name || 'дорогой клиент'}! Это напоминание о вашем ${booking.service || 'приеме'}, запланированном на ${appointmentTime}. Свяжитесь с нами, если нужно внести изменения.`
      };
      
      return fallbackMessages[language] || fallbackMessages['en'];
    }
  }

  // Create reminders for a new booking
  async createRemindersForBooking(bookingId: string): Promise<void> {
    try {
      const booking = await storage.getBooking(bookingId);
      if (!booking || !booking.dateTime) {
        console.log('Booking not found or no dateTime:', bookingId);
        return;
      }

      const customer = booking.customerId ? await storage.getCustomer(booking.customerId) : null;
      const preferences = await storage.getUserReminderPreferences(booking.userId);

      // Use default preferences if none exist
      const defaultPreferences = {
        userId: booking.userId,
        emailReminders: true,
        smsReminders: false,
        whatsappReminders: false,
        reminderTiming: ['24h', '1h'],
        language: 'en',
      };

      const userPrefs = preferences || defaultPreferences;
      const appointmentTime = new Date(booking.dateTime);
      const now = new Date();

      // Create reminders for each enabled type and timing
      const reminderTypes = [];
      if (userPrefs.emailReminders && customer?.email) reminderTypes.push('email');
      if (userPrefs.smsReminders && customer?.phone) reminderTypes.push('sms');
      if (userPrefs.whatsappReminders && customer?.phone) reminderTypes.push('whatsapp');

      const timings = Array.isArray(userPrefs.reminderTiming) 
        ? userPrefs.reminderTiming 
        : ['24h', '1h'];

      for (const reminderType of reminderTypes) {
        for (const timing of timings) {
          const scheduledTime = this.calculateReminderTime(appointmentTime, timing);
          
          // Only create reminder if it's in the future
          if (scheduledTime > now) {
            const messageContent = await this.generateReminderMessage(
              booking,
              customer,
              userPrefs,
              reminderType
            );

            await storage.createBookingReminder({
              bookingId: booking.id,
              userId: booking.userId,
              reminderType,
              scheduledTime,
              messageContent,
              status: 'pending',
            });

            console.log(`Created ${reminderType} reminder for booking ${bookingId} at ${scheduledTime}`);
          }
        }
      }
    } catch (error) {
      console.error('Error creating reminders for booking:', error);
    }
  }

  // Process pending reminders (called by cron job or scheduler)
  async processPendingReminders(): Promise<void> {
    try {
      const pendingReminders = await storage.getPendingReminders();
      console.log(`Processing ${pendingReminders.length} pending reminders`);

      for (const reminder of pendingReminders) {
        try {
          await this.sendReminder(reminder);
        } catch (error) {
          console.error(`Error sending reminder ${reminder.id}:`, error);
          await storage.updateReminderStatus(
            reminder.id,
            'failed',
            new Date(),
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    } catch (error) {
      console.error('Error processing pending reminders:', error);
    }
  }

  // Send individual reminder
  private async sendReminder(reminder: any): Promise<void> {
    const booking = await storage.getBooking(reminder.bookingId);
    const customer = booking?.customerId ? await storage.getCustomer(booking.customerId) : null;

    if (!booking || !customer) {
      await storage.updateReminderStatus(reminder.id, 'failed', new Date(), 'Booking or customer not found');
      return;
    }

    switch (reminder.reminderType) {
      case 'email':
        await this.sendEmailReminder(reminder, booking, customer);
        break;
      case 'sms':
        await this.sendSMSReminder(reminder, booking, customer);
        break;
      case 'whatsapp':
        await this.sendWhatsAppReminder(reminder, booking, customer);
        break;
      default:
        throw new Error(`Unknown reminder type: ${reminder.reminderType}`);
    }

    await storage.updateReminderStatus(reminder.id, 'sent', new Date());
    console.log(`Sent ${reminder.reminderType} reminder to ${customer.name}`);
  }

  private async sendEmailReminder(reminder: any, booking: any, customer: any): Promise<void> {
    // For now, just log. In production, integrate with email service like SendGrid, Nodemailer, etc.
    console.log(`📧 EMAIL REMINDER SENT:`);
    console.log(`To: ${customer.email}`);
    console.log(`Subject: Appointment Reminder - ${booking.service}`);
    console.log(`Message: ${reminder.messageContent}`);
    
    // TODO: Implement actual email sending
    // await emailService.send({
    //   to: customer.email,
    //   subject: `Appointment Reminder - ${booking.service}`,
    //   text: reminder.messageContent
    // });
  }

  private async sendSMSReminder(reminder: any, booking: any, customer: any): Promise<void> {
    // For now, just log. In production, integrate with SMS service like Twilio
    console.log(`📱 SMS REMINDER SENT:`);
    console.log(`To: ${customer.phone}`);
    console.log(`Message: ${reminder.messageContent}`);
    
    // TODO: Implement actual SMS sending
    // await smsService.send({
    //   to: customer.phone,
    //   message: reminder.messageContent
    // });
  }

  private async sendWhatsAppReminder(reminder: any, booking: any, customer: any): Promise<void> {
    // For now, just log. In production, integrate with WhatsApp Business API
    console.log(`💬 WHATSAPP REMINDER SENT:`);
    console.log(`To: ${customer.phone}`);
    console.log(`Message: ${reminder.messageContent}`);
    
    // TODO: Implement actual WhatsApp sending
    // await whatsappService.send({
    //   to: customer.phone,
    //   message: reminder.messageContent
    // });
  }

  // Start reminder processing scheduler
  startReminderScheduler(): void {
    // Process reminders every 5 minutes
    setInterval(() => {
      this.processPendingReminders();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('Reminder scheduler started - checking every 5 minutes');
  }
}

export const reminderService = new ReminderService();