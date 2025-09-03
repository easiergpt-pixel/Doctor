import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Mail, MessageSquare, Phone, Clock, Languages, Save, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const reminderPreferencesSchema = z.object({
  emailReminders: z.boolean().default(true),
  smsReminders: z.boolean().default(false),
  whatsappReminders: z.boolean().default(false),
  reminderTiming: z.array(z.string()).default(['24h', '1h']),
  customMessage: z.string().optional(),
  language: z.enum(['en', 'az', 'ru']).default('en'),
});

type ReminderPreferencesFormData = z.infer<typeof reminderPreferencesSchema>;

export default function ReminderSettings() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newTiming, setNewTiming] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const form = useForm<ReminderPreferencesFormData>({
    resolver: zodResolver(reminderPreferencesSchema),
    defaultValues: {
      emailReminders: true,
      smsReminders: false,
      whatsappReminders: false,
      reminderTiming: ['24h', '1h'],
      customMessage: '',
      language: 'en',
    },
  });

  // Fetch current reminder preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/reminder-preferences'],
    enabled: isAuthenticated && !isLoading,
  });

  // Update form when preferences are loaded
  useEffect(() => {
    if (preferences && typeof preferences === 'object') {
      const prefs = preferences as any;
      form.reset({
        emailReminders: prefs.emailReminders ?? true,
        smsReminders: prefs.smsReminders ?? false,
        whatsappReminders: prefs.whatsappReminders ?? false,
        reminderTiming: Array.isArray(prefs.reminderTiming) ? prefs.reminderTiming : ['24h', '1h'],
        customMessage: prefs.customMessage || '',
        language: prefs.language || 'en',
      });
    }
  }, [preferences, form]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: (data: ReminderPreferencesFormData) => 
      apiRequest('POST', '/api/reminder-preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminder-preferences'] });
      toast({ 
        title: "Success", 
        description: "Reminder preferences saved successfully!" 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReminderPreferencesFormData) => {
    savePreferencesMutation.mutate(data);
  };

  // Add new reminder timing
  const addReminderTiming = () => {
    if (newTiming && !form.getValues().reminderTiming.includes(newTiming)) {
      const currentTimings = form.getValues().reminderTiming;
      form.setValue('reminderTiming', [...currentTimings, newTiming]);
      setNewTiming('');
    }
  };

  // Remove reminder timing
  const removeReminderTiming = (timing: string) => {
    const currentTimings = form.getValues().reminderTiming;
    form.setValue('reminderTiming', currentTimings.filter(t => t !== timing));
  };

  const presetTimings = [
    { value: '15min', label: '15 minutes before' },
    { value: '30min', label: '30 minutes before' },
    { value: '1h', label: '1 hour before' },
    { value: '2h', label: '2 hours before' },
    { value: '24h', label: '24 hours before' },
    { value: '48h', label: '2 days before' },
    { value: '7d', label: '1 week before' },
  ];

  const languageOptions = [
    { value: 'en', label: '🇺🇸 English' },
    { value: 'az', label: '🇦🇿 Azerbaijani' },
    { value: 'ru', label: '🇷🇺 Russian' },
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Reminder Settings" 
          subtitle="Configure how and when to send appointment reminders"
          onMenuToggle={() => setSidebarOpen(true)} 
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Reminder Settings</h1>
                <p className="text-muted-foreground">
                  Configure how and when you want to send appointment reminders to your customers
                </p>
              </div>
            </div>

            {preferencesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Notification Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Notification Types
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Choose which communication channels to use for sending reminders
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="emailReminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-blue-600" />
                              <div>
                                <FormLabel className="text-base font-medium">Email Reminders</FormLabel>
                                <FormDescription>
                                  Send appointment reminders via email to customers
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-reminders"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smsReminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 text-green-600" />
                              <div>
                                <FormLabel className="text-base font-medium">SMS Reminders</FormLabel>
                                <FormDescription>
                                  Send appointment reminders via SMS text messages
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-sms-reminders"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsappReminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <MessageSquare className="h-5 w-5 text-green-500" />
                              <div>
                                <FormLabel className="text-base font-medium">WhatsApp Reminders</FormLabel>
                                <FormDescription>
                                  Send appointment reminders via WhatsApp Business
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-whatsapp-reminders"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Reminder Timing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Reminder Timing
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Set when reminders should be sent before each appointment
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="reminderTiming"
                        render={({ field }) => (
                          <FormItem>
                            <div className="space-y-3">
                              {/* Current reminder timings */}
                              <div className="flex flex-wrap gap-2">
                                {field.value.map((timing) => (
                                  <Badge
                                    key={timing}
                                    variant="secondary"
                                    className="px-3 py-1 flex items-center gap-2"
                                  >
                                    {presetTimings.find(p => p.value === timing)?.label || timing}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={() => removeReminderTiming(timing)}
                                      data-testid={`remove-timing-${timing}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>

                              {/* Add new timing */}
                              <div className="flex items-center gap-2">
                                <Select value={newTiming} onValueChange={setNewTiming}>
                                  <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Add reminder time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {presetTimings
                                      .filter(preset => !field.value.includes(preset.value))
                                      .map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value}>
                                          {preset.label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addReminderTiming}
                                  disabled={!newTiming}
                                  data-testid="button-add-timing"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Language & Personalization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Languages className="h-5 w-5" />
                        Language & Personalization
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Customize the language and messaging for your reminders
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reminder Language</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-language">
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {languageOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose the language for reminder messages
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Message (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Add a personal touch to your reminders... e.g., 'Thank you for choosing our clinic. We look forward to seeing you!'"
                                className="min-h-20"
                                data-testid="textarea-custom-message"
                              />
                            </FormControl>
                            <FormDescription>
                              This message will be included in all reminder notifications
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={savePreferencesMutation.isPending}
                      className="min-w-32"
                      data-testid="button-save-preferences"
                    >
                      {savePreferencesMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-background border-t-transparent rounded-full mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}