// backend/src/services/whatsappGateway/IWhatsAppService.js

/**
 * WhatsApp Service Interface
 * All providers must implement these methods
 */
class IWhatsAppService {
  constructor() {
    this.status = 'disconnected';
    this.phoneNumber = null;
    this.qr = null;
    this.lastConnected = null;
    this.clients = []; // For SSE
    this.messageQueue = [];
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      totalPending: 0,
    };
  }

  // Core methods (must be implemented by subclasses)
  async sendMessage(to, message, type, sentBy, metadata) {
    throw new Error('sendMessage() must be implemented');
  }

  async sendBulkMessages(messages, sentBy) {
    throw new Error('sendBulkMessages() must be implemented');
  }

  getStatus() {
    throw new Error('getStatus() must be implemented');
  }

  isReady() {
    throw new Error('isReady() must be implemented');
  }

  // Optional methods (can be overridden)
  async initialize() {
    console.log('initialize() not implemented for this provider');
  }

  async disconnect() {
    console.log('disconnect() not implemented for this provider');
  }

  async loadStats() {
    console.log('loadStats() not implemented for this provider');
  }

  // SSE methods (used by controller)
  addClient(client) {
    this.clients.push(client);
    console.log(`📡 SSE Client connected. Total: ${this.clients.length}`);
  }

  removeClient(client) {
    this.clients = this.clients.filter(c => c !== client);
    console.log(`📡 SSE Client disconnected. Total: ${this.clients.length}`);
  }

  broadcastUpdate() {
    const data = JSON.stringify(this.getStatus());
    this.clients.forEach(client => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    });
  }
}

module.exports = IWhatsAppService;
