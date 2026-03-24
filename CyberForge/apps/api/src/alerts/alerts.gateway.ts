import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AlertsGateway.name);
  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Join alerts room
    client.join('alerts');
    client.emit('connection', { message: 'Connected to alerts stream' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Broadcast alert to all connected clients
   */
  broadcastAlert(alertData: any) {
    this.server.to('alerts').emit('alert-triggered', alertData);
    this.logger.log(`Alert broadcast: ${alertData.message}`);
  }

  /**
   * Broadcast alert acknowledgement
   */
  broadcastAlertAcknowledged(alertId: string, userId: string) {
    this.server.to('alerts').emit('alert-acknowledged', { alertId, userId });
  }

  /**
   * Broadcast alert resolved
   */
  broadcastAlertResolved(alertId: string, userId: string) {
    this.server.to('alerts').emit('alert-resolved', { alertId, userId });
  }

  @SubscribeMessage('subscribe-alerts')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    client.join('alerts');
    return { message: 'Subscribed to alerts' };
  }

  @SubscribeMessage('unsubscribe-alerts')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    client.leave('alerts');
    return { message: 'Unsubscribed from alerts' };
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any): any {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }
}
