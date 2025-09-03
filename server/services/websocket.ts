import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from '../storage';

interface WSClient {
  ws: WebSocket;
  userId: string;
}

export class RealtimeService {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'auth':
        await this.authenticateClient(ws, message.userId);
        break;
      case 'join_conversation':
        await this.joinConversation(ws, message.conversationId);
        break;
      case 'send_message':
        await this.handleNewMessage(ws, message);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  private async authenticateClient(ws: WebSocket, userId: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
        ws.close();
        return;
      }

      // Store client connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, []);
      }
      this.clients.get(userId)!.push({ ws, userId });

      ws.send(JSON.stringify({ type: 'authenticated', userId }));

      // Send initial data
      const activeConversations = await storage.getActiveConversations(userId);
      ws.send(JSON.stringify({ 
        type: 'active_conversations', 
        conversations: activeConversations 
      }));

    } catch (error) {
      console.error('Error authenticating client:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication error' }));
    }
  }

  private async joinConversation(ws: WebSocket, conversationId: string) {
    try {
      const messages = await storage.getMessagesByConversation(conversationId);
      ws.send(JSON.stringify({ 
        type: 'conversation_history', 
        conversationId,
        messages 
      }));
    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  }

  private async handleNewMessage(ws: WebSocket, message: any) {
    try {
      const { conversationId, content, sender } = message;
      
      const newMessage = await storage.createMessage({
        conversationId,
        content,
        sender,
        metadata: message.metadata || {},
      });

      // Broadcast to all clients of this user
      const conversation = await storage.getConversation(conversationId);
      if (conversation) {
        this.broadcastToUser(conversation.userId, {
          type: 'new_message',
          message: newMessage,
          conversationId,
        });
      }

    } catch (error) {
      console.error('Error handling new message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
  }

  private removeClient(ws: WebSocket) {
    for (const [userId, clients] of this.clients.entries()) {
      const index = clients.findIndex(client => client.ws === ws);
      if (index !== -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          this.clients.delete(userId);
        }
        break;
      }
    }
  }

  public broadcastToUser(userId: string, data: any) {
    const clients = this.clients.get(userId);
    if (clients) {
      const message = JSON.stringify(data);
      clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message);
        }
      });
    }
  }

  public notifyNewConversation(userId: string, conversation: any) {
    this.broadcastToUser(userId, {
      type: 'new_conversation',
      conversation,
    });
  }

  public notifyBookingCreated(userId: string, booking: any) {
    this.broadcastToUser(userId, {
      type: 'new_booking',
      booking,
    });
  }
}
