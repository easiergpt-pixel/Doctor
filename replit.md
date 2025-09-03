# AI Receptionist Platform

## Overview

This is a full-stack AI receptionist platform that enables businesses to automate customer communications across multiple channels (WhatsApp, Facebook, Instagram, website chat, Telegram). The system provides intelligent conversation handling, appointment booking capabilities, customer management, and real-time analytics. Built with modern web technologies, it features a responsive dashboard for business owners to monitor and manage their AI receptionist operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Progress (September 2025)

### Completed Features
- ✅ **Complete Booking Confirmation Workflow**: AI checks owner availability, proposes time slots, customer chooses, owner approves/rejects
- ✅ **Schedule Settings System**: Weekly availability management, custom time slots, blackout dates
- ✅ **Booking Approval Interface**: Review pending bookings with full customer context and actions
- ✅ **AI Customer Notifications**: Automated responses sent to customers via original channels (Telegram working)
- ✅ **Enhanced UI Features**: Reschedule dialog with date/time picker, dark mode toggle, improved sidebar navigation
- ✅ **Multilingual Support**: Full Azerbaijani language support with cultural context

### Key Workflows Implemented
1. **Customer Booking Flow**: Customer writes to AI → AI checks available slots → AI proposes options → Customer chooses → Owner gets notification
2. **Owner Approval Flow**: Owner reviews booking in Approvals page → Approve/Reject/Reschedule with comments → AI automatically notifies customer
3. **Schedule Management**: Set weekly availability, manage time slots, add blackout dates

### Technical Achievements
- Complete notification service with Telegram API integration
- Real-time booking status updates
- Smart availability checking with existing bookings consideration
- Comprehensive booking confirmation database schema

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: Shadcn/ui components built on Radix UI primitives for accessible, customizable design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript for end-to-end type safety
- **Authentication**: Replit Auth with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage for scalable session handling
- **Real-time Communication**: WebSocket server for live conversation updates and notifications

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Relational model with users, customers, conversations, messages, bookings, channels, and AI training data
- **Connection**: Neon serverless PostgreSQL for scalable cloud database hosting
- **Migrations**: Drizzle Kit for database schema management and migrations

### AI Integration
- **Provider**: OpenAI GPT-5 for natural language processing and conversation handling
- **Capabilities**: Intelligent response generation, appointment booking detection, and context-aware conversations
- **Training**: Custom AI training data per business for personalized responses
- **Response Processing**: Structured AI responses with confidence scoring and action detection

### Real-time Features
- **WebSocket Service**: Custom implementation for live conversation monitoring
- **Client Management**: Connection pooling and user authentication for real-time updates
- **Event Broadcasting**: Real-time notifications for new messages, bookings, and status changes

## External Dependencies

### Payment Processing
- **Stripe**: Complete payment processing with subscription management and billing
- **Components**: React Stripe.js for secure payment form handling
- **Webhooks**: Stripe webhook processing for subscription status updates

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database queries and schema management
- **Connect PG Simple**: PostgreSQL session store for Express sessions

### Authentication
- **Replit Auth**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware for Express
- **Session Storage**: PostgreSQL-backed session management

### AI Services
- **OpenAI API**: GPT-5 model for conversation processing and response generation
- **Custom Training**: Business-specific AI training data storage and retrieval

### Development Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast JavaScript bundling for production builds
- **Replit Development**: Integrated development environment with runtime error handling

### UI Libraries
- **Radix UI**: Accessible component primitives for form controls and interactive elements
- **Lucide React**: Consistent icon library for UI elements
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe CSS class composition