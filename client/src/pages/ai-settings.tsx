import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Globe, Brain, MessageSquare, Plus, Save, RefreshCw } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertAiTrainingSchema } from "@shared/schema";

const languageFormSchema = z.object({
  preferredLanguage: z.string(),
  aiPromptCustomization: z.string().optional(),
  aiLanguageInstructions: z.string().optional(),
});

const aiTrainingFormSchema = insertAiTrainingSchema.extend({
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
});

export default function AISettings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);

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

  // Fetch current user settings
  const { data: userSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Fetch AI training data
  const { data: aiTrainingData, isLoading: isLoadingTraining } = useQuery({
    queryKey: ["/api/ai-training"],
    retry: false,
  });

  // Language and prompt form
  const languageForm = useForm<z.infer<typeof languageFormSchema>>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      preferredLanguage: userSettings?.preferredLanguage || "en",
      aiPromptCustomization: userSettings?.aiPromptCustomization || "",
      aiLanguageInstructions: userSettings?.aiLanguageInstructions || "",
    },
  });

  // AI training form
  const trainingForm = useForm<z.infer<typeof aiTrainingFormSchema>>({
    resolver: zodResolver(aiTrainingFormSchema),
    defaultValues: {
      content: "",
      category: "",
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (userSettings) {
      languageForm.reset({
        preferredLanguage: userSettings.preferredLanguage || "en",
        aiPromptCustomization: userSettings.aiPromptCustomization || "",
        aiLanguageInstructions: userSettings.aiLanguageInstructions || "",
      });
    }
  }, [userSettings, languageForm]);

  // Save language settings mutation
  const saveLanguageSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof languageFormSchema>) => {
      await apiRequest("PUT", "/api/ai-settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your AI and language preferences have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save settings: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Create AI training mutation
  const createTrainingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof aiTrainingFormSchema>) => {
      await apiRequest("POST", "/api/ai-training", data);
    },
    onSuccess: () => {
      toast({
        title: "Training Data Added",
        description: "Your AI training data has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-training"] });
      trainingForm.reset();
      setIsTrainingDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save training data: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onLanguageSubmit = (data: z.infer<typeof languageFormSchema>) => {
    saveLanguageSettingsMutation.mutate(data);
  };

  const onTrainingSubmit = (data: z.infer<typeof aiTrainingFormSchema>) => {
    createTrainingMutation.mutate(data);
  };

  const languages = [
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "az", label: "Azərbaycan dili", flag: "🇦🇿" },
    { value: "ru", label: "Русский", flag: "🇷🇺" },
    { value: "tr", label: "Türkçe", flag: "🇹🇷" },
    { value: "es", label: "Español", flag: "🇪🇸" },
    { value: "fr", label: "Français", flag: "🇫🇷" },
    { value: "de", label: "Deutsch", flag: "🇩🇪" },
    { value: "pt", label: "Português", flag: "🇵🇹" },
    { value: "ar", label: "العربية", flag: "🇸🇦" },
  ];

  const categoryOptions = [
    { value: "faq", label: "FAQs" },
    { value: "services", label: "Services" },
    { value: "policies", label: "Policies" },
    { value: "hours", label: "Business Hours" },
    { value: "pricing", label: "Pricing" },
    { value: "contact", label: "Contact Information" },
    { value: "booking", label: "Booking Instructions" },
    { value: "general", label: "General Information" },
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="AI Settings" subtitle="Configure your AI receptionist's language, behavior, and training data" />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Configure your AI receptionist's language, behavior, and training data
          </p>
        </div>

        <Tabs defaultValue="language" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="language" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Language & Prompts</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Training Data</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Preview</span>
            </TabsTrigger>
          </TabsList>

          {/* Language & Prompts Tab */}
          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Language & AI Behavior Settings</span>
                </CardTitle>
                <CardDescription>
                  Set your preferred language and customize how your AI receptionist responds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...languageForm}>
                  <form onSubmit={languageForm.handleSubmit(onLanguageSubmit)} className="space-y-6">
                    <FormField
                      control={languageForm.control}
                      name="preferredLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Language</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-language">
                                <SelectValue placeholder="Select your primary language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languages.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  <div className="flex items-center space-x-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Your AI will primarily respond in this language
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={languageForm.control}
                      name="aiPromptCustomization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom AI Prompt (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              data-testid="textarea-custom-prompt"
                              placeholder="Add custom instructions for your AI receptionist's behavior..."
                              className="min-h-[120px]"
                            />
                          </FormControl>
                          <FormDescription>
                            Customize how your AI behaves. This will be added to the base prompt.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={languageForm.control}
                      name="aiLanguageInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language-Specific Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              data-testid="textarea-language-instructions"
                              placeholder="Add specific instructions for how to respond in your chosen language..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormDescription>
                            Special instructions for cultural context, formality level, or language-specific behaviors
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      data-testid="button-save-language-settings"
                      disabled={saveLanguageSettingsMutation.isPending}
                      className="w-full"
                    >
                      {saveLanguageSettingsMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Language Settings
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Data Tab */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Training Data</span>
                </CardTitle>
                <CardDescription>
                  Add custom knowledge for your AI receptionist about your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Manage your AI's knowledge base with business-specific information
                    </p>
                    <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-training-data">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Training Data
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add AI Training Data</DialogTitle>
                          <DialogDescription>
                            Add information that you want your AI to know about your business
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...trainingForm}>
                          <form onSubmit={trainingForm.handleSubmit(onTrainingSubmit)} className="space-y-4">
                            <FormField
                              control={trainingForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-training-category">
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categoryOptions.map((category) => (
                                        <SelectItem key={category.value} value={category.value}>
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={trainingForm.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Content</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      data-testid="textarea-training-content"
                                      placeholder="Enter the information you want your AI to know..."
                                      className="min-h-[120px]"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Be specific and detailed. This information will help your AI provide better responses.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                data-testid="button-save-training-data"
                                disabled={createTrainingMutation.isPending}
                              >
                                {createTrainingMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save Training Data"
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {isLoadingTraining ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {aiTrainingData?.length > 0 ? (
                        aiTrainingData.map((training: any) => (
                          <Card key={training.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" data-testid={`badge-category-${training.id}`}>
                                    {categoryOptions.find(c => c.value === training.category)?.label || training.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(training.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm" data-testid={`text-training-content-${training.id}`}>
                                  {training.content}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No training data added yet</p>
                          <p className="text-sm text-muted-foreground">Add information about your business to improve AI responses</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>AI Response Preview</span>
                </CardTitle>
                <CardDescription>
                  See how your AI will respond with current settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Current Settings Summary:</p>
                    <div className="space-y-1 text-sm">
                      <p><strong>Language:</strong> {languages.find(l => l.value === userSettings?.preferredLanguage)?.label || "English"}</p>
                      <p><strong>Custom Prompt:</strong> {userSettings?.aiPromptCustomization ? "✓ Configured" : "Default"}</p>
                      <p><strong>Language Instructions:</strong> {userSettings?.aiLanguageInstructions ? "✓ Configured" : "Default"}</p>
                      <p><strong>Training Data:</strong> {aiTrainingData?.length || 0} entries</p>
                    </div>
                  </div>
                  <div className="bg-background border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Sample AI Response:</p>
                    <div className="bg-primary/10 p-3 rounded border-l-4 border-primary">
                      <p className="text-sm">
                        {userSettings?.preferredLanguage === 'az' && (
                          "Salam! Mən sizin AI köməkçinizəm. Sizə necə kömək edə bilərəm?"
                        )}
                        {userSettings?.preferredLanguage === 'ru' && (
                          "Здравствуйте! Я ваш AI-помощник. Как я могу вам помочь?"
                        )}
                        {(!userSettings?.preferredLanguage || userSettings?.preferredLanguage === 'en') && (
                          "Hello! I'm your AI receptionist. How can I help you today?"
                        )}
                        {userSettings?.preferredLanguage && !['en', 'az', 'ru'].includes(userSettings.preferredLanguage) && (
                          "Hello! I'm your AI receptionist. How can I help you today?"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}