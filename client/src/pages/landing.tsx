import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bot, 
  MessageSquare, 
  Calendar, 
  Users, 
  BarChart3,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Globe,
  Facebook,
  Instagram
} from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Receptionist</h1>
              <p className="text-xs text-muted-foreground">Business Automation</p>
            </div>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Automate Your Customer Communications with AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect WhatsApp, Facebook, Instagram, and your website to one powerful AI receptionist. 
            Handle bookings, answer questions, and manage customer relationships 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} data-testid="button-hero-start">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" data-testid="button-demo">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need to Automate Customer Service
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our AI receptionist handles everything from initial contact to booking confirmations, 
            keeping your customers happy while you focus on growing your business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-border hover:shadow-md transition-shadow">
            <CardHeader>
              <MessageSquare className="w-10 h-10 text-primary mb-4" />
              <CardTitle>Multi-Channel Support</CardTitle>
              <CardDescription>
                Connect WhatsApp, Facebook Messenger, Instagram DMs, and website chat in one dashboard
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardHeader>
              <Bot className="w-10 h-10 text-primary mb-4" />
              <CardTitle>Intelligent AI Responses</CardTitle>
              <CardDescription>
                Powered by GPT-5, our AI understands context and provides human-like customer service
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardHeader>
              <Calendar className="w-10 h-10 text-primary mb-4" />
              <CardTitle>Automated Booking</CardTitle>
              <CardDescription>
                Let customers book appointments directly through chat without human intervention
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardHeader>
              <Users className="w-10 h-10 text-primary mb-4" />
              <CardTitle>Customer CRM</CardTitle>
              <CardDescription>
                Automatically collect and organize customer data from all conversation channels
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardHeader>
              <BarChart3 className="w-10 h-10 text-primary mb-4" />
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Track conversation volumes, booking rates, and customer satisfaction metrics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardHeader>
              <Globe className="w-10 h-10 text-primary mb-4" />
              <CardTitle>Easy Integration</CardTitle>
              <CardDescription>
                Simple setup process with embeddable widgets and API connections
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Connect All Your Customer Touchpoints
          </h2>
          <p className="text-muted-foreground">
            Integrate with the platforms your customers already use
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center p-6 rounded-lg bg-card border border-border">
            <Smartphone className="w-12 h-12 text-green-500 mb-3" />
            <span className="font-medium">WhatsApp</span>
          </div>
          <div className="flex flex-col items-center p-6 rounded-lg bg-card border border-border">
            <Facebook className="w-12 h-12 text-blue-600 mb-3" />
            <span className="font-medium">Messenger</span>
          </div>
          <div className="flex flex-col items-center p-6 rounded-lg bg-card border border-border">
            <Instagram className="w-12 h-12 text-pink-500 mb-3" />
            <span className="font-medium">Instagram</span>
          </div>
          <div className="flex flex-col items-center p-6 rounded-lg bg-card border border-border">
            <Globe className="w-12 h-12 text-purple-600 mb-3" />
            <span className="font-medium">Website</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground">
            Pay only for what you use. No hidden fees or long-term contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Starter</CardTitle>
              <CardDescription>Perfect for small businesses</CardDescription>
              <div className="text-3xl font-bold text-foreground">$29<span className="text-lg text-muted-foreground">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>1,000 messages/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>2 connected channels</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Email support</span>
                </li>
              </ul>
              <Button className="w-full mt-6" variant="outline" data-testid="button-starter">
                Start Free Trial
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary shadow-md">
            <CardHeader>
              <div className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full w-fit mb-2">
                Most Popular
              </div>
              <CardTitle>Professional</CardTitle>
              <CardDescription>For growing businesses</CardDescription>
              <div className="text-3xl font-bold text-foreground">$79<span className="text-lg text-muted-foreground">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>5,000 messages/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Unlimited channels</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Custom AI training</span>
                </li>
              </ul>
              <Button className="w-full mt-6" data-testid="button-professional">
                Start Free Trial
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>For large organizations</CardDescription>
              <div className="text-3xl font-bold text-foreground">$199<span className="text-lg text-muted-foreground">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>20,000 messages/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Unlimited channels</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>24/7 phone support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Custom integrations</span>
                </li>
              </ul>
              <Button className="w-full mt-6" variant="outline" data-testid="button-enterprise">
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Customer Service?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using AI to provide better customer experiences. 
            Set up your AI receptionist in minutes, not weeks.
          </p>
          <Button size="lg" onClick={handleLogin} data-testid="button-cta">
            Start Your Free Trial Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">AI Receptionist</h3>
                <p className="text-xs text-muted-foreground">Business Automation Platform</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 AI Receptionist. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
