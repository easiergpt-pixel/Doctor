import { log } from "../vite";

function tick() {
  // TODO: check DB for due reminders and send notifications
  log("reminder tick", "reminder");
}

class ReminderService {
  private timer: NodeJS.Timeout | null = null;
  startReminderScheduler(intervalMs = 5 * 60 * 1000) {
    if (this.timer) return;
    this.timer = setInterval(tick, intervalMs);
    log(`Reminder scheduler started (every ${intervalMs / 1000}s)`, "reminder");
  }
  stopReminderScheduler() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
export const reminderService = new ReminderService();
