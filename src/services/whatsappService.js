
const pino = require('pino');
const qrcode = require('qrcode');
const Message = require('../models/Message');

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qr = null;
    this.status = 'disconnected';
    this.lastConnected = null;
    this.phoneNumber = null;
    this.clients = [];
    this.messageQueue = [];
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      totalPending: 0,
    };
  }

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('./sessions/lafi');
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Lafi Swimming Academy', 'Chrome', '3.0'],
      });

      // Message status update handler
      this.sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          if (update.update.status) {
            await this.updateMessageStatus(update.key.id, update.update.status);
          }
        }
      });

      // QR Code Handler
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qr = await qrcode.toDataURL(qr);
          this.status = 'qr';
          this.broadcastUpdate();
          console.log('📱 QR Code generated');
        }

        if (connection === 'close') {
          const shouldReconnect = 
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

          console.log('Connection closed. Reconnecting:', shouldReconnect);
          this.status = 'disconnected';
          this.qr = null;
          this.broadcastUpdate();

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 3000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qr = null;
          this.lastConnected = new Date();
          this.phoneNumber = this.sock.user?.id?.split(':')[0] || 'Unknown';
          this.broadcastUpdate();
          console.log('✅ WhatsApp Connected:', this.phoneNumber);
          
          // Process queued messages
          this.processQueue();
        }
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Load stats from database
      await this.loadStats();

    } catch (error) {
      console.error('❌ WhatsApp initialization error:', error);
      this.status = 'error';
      this.broadcastUpdate();
    }
  }

  /**
   * Check if WhatsApp is ready to send messages
   * @returns {boolean}
   */
  isReady() {
    return this.status === 'connected' && this.sock !== null;
  }

  /**
   * Send message (simple version for schedule reminders)
   * @param {string} to - Phone number
   * @param {string} message - Message text
   * @param {string} type - Message type (default: 'manual')
   * @param {string} sentBy - Sender ID (optional)
   * @param {object} metadata - Additional metadata (optional)
   */
  async sendMessage(to, message, type = 'manual', sentBy = null, metadata = {}) {
    try {
      // Normalize phone number
      let phoneNumber = to.replace(/[^0-9]/g, '');
      
      // Handle Indonesian phone numbers
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.substring(1);
      }
      if (!phoneNumber.startsWith('62')) {
        phoneNumber = '62' + phoneNumber;
      }

      const jid = `${phoneNumber}@s.whatsapp.net`;

      // Check if connected
      if (!this.isReady()) {
        // Add to queue if not connected
        this.messageQueue.push({ to, message, type, sentBy, metadata });
        this.stats.totalPending++;
        
        throw new Error('WhatsApp is not connected. Message queued.');
      }

      // Create message log
      const messageLog = await Message.create({
        recipient: phoneNumber,
        recipientName: metadata.recipientName || null,
        message,
        type,
        status: 'pending',
        sentBy,
        sentByName: metadata.sentByName || null,
        metadata: {
          ...metadata,
          waMessageId: null // Will be updated after send
        },
      });

      // Send message via Baileys
      const result = await this.sock.sendMessage(jid, { text: message });

      // Update message log with success
      messageLog.status = 'sent';
      messageLog.sentAt = new Date();
      messageLog.metadata.waMessageId = result.key.id;
      await messageLog.save();

      this.stats.totalSent++;
      this.broadcastUpdate();

      console.log(`✅ Message sent to ${phoneNumber}`);

      return { 
        success: true, 
        messageId: messageLog._id,
        waMessageId: result.key.id,
        message: 'Message sent successfully',
        recipient: phoneNumber
      };

    } catch (error) {
      console.error('❌ Send message error:', error);
      this.stats.totalFailed++;
      
      // Try to update message log with error
      try {
        await Message.findOneAndUpdate(
          { recipient: to.replace(/[^0-9]/g, ''), status: 'pending' },
          { 
            status: 'failed',
            error: error.message 
          },
          { sort: { createdAt: -1 } }
        );
      } catch (updateError) {
        console.error('Failed to update message log:', updateError);
      }

      throw error;
    }
  }

  /**
   * Send bulk messages with delay
   * @param {Array} messages - Array of message objects
   * @param {string} sentBy - Sender ID
   * @returns {Array} Results
   */
  async sendBulkMessages(messages, sentBy = null) {
    const results = [];
    
    for (const msg of messages) {
      try {
        const result = await this.sendMessage(
          msg.to,
          msg.message,
          msg.type || 'broadcast',
          sentBy,
          msg.metadata || {}
        );
        results.push({ ...result, to: msg.to });
        
        // Delay to avoid rate limiting (2 seconds between messages)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        results.push({ 
          success: false, 
          to: msg.to, 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Update message status based on WhatsApp delivery status
   * @param {string} messageId - WhatsApp message ID
   * @param {number} status - Status code (1=delivered, 3=read)
   */
  async updateMessageStatus(messageId, status) {
    try {
      const statusMap = {
        1: 'delivered',
        2: 'delivered',
        3: 'read',
      };

      const newStatus = statusMap[status];
      if (!newStatus) return;

      const message = await Message.findOne({ 'metadata.waMessageId': messageId });
      if (message) {
        message.status = newStatus;
        if (newStatus === 'delivered') {
          message.deliveredAt = new Date();
        } else if (newStatus === 'read') {
          message.readAt = new Date();
        }
        await message.save();
        
        console.log(`📊 Message ${messageId} status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('❌ Update message status error:', error);
    }
  }

  /**
   * Load statistics from database
   */
  async loadStats() {
    try {
      const sentCount = await Message.countDocuments({ status: 'sent' });
      const failedCount = await Message.countDocuments({ status: 'failed' });
      const pendingCount = await Message.countDocuments({ status: 'pending' });

      this.stats = {
        totalSent: sentCount,
        totalFailed: failedCount,
        totalPending: pendingCount,
      };
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  /**
   * Get current status with statistics
   * @returns {object} Status object
   */
  getStatus() {
    return {
      status: this.status,
      qr: this.qr,
      phoneNumber: this.phoneNumber,
      lastConnected: this.lastConnected,
      uptime: this.lastConnected ? Date.now() - this.lastConnected.getTime() : 0,
      isReady: this.isReady(),
      queueLength: this.messageQueue.length,
      stats: this.stats,
    };
  }

  /**
   * Process queued messages when connection is restored
   */
  async processQueue() {
    console.log(`📬 Processing ${this.messageQueue.length} queued messages...`);
    
    while (this.messageQueue.length > 0 && this.isReady()) {
      const msg = this.messageQueue.shift();
      try {
        await this.sendMessage(msg.to, msg.message, msg.type, msg.sentBy, msg.metadata);
        this.stats.totalPending--;
        
        // Delay between queued messages
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('❌ Queue processing error:', error);
        // Re-add to queue if failed
        this.messageQueue.push(msg);
        break; // Stop processing if error occurs
      }
    }
    
    console.log('✅ Queue processing completed');
  }

  /**
   * Disconnect and logout WhatsApp
   */
  async disconnect() {
    if (this.sock) {
      try {
        // Logout to clear session
        await this.sock.logout();
        console.log('🔴 WhatsApp logged out');
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      this.sock = null;
      this.status = 'disconnected';
      this.qr = null;
      this.phoneNumber = null;
      this.lastConnected = null;
      this.broadcastUpdate();
      
      console.log('🔴 WhatsApp disconnected');
    }
  }

  /**
   * Reconnect WhatsApp
   */
  async reconnect() {
    console.log('🔄 Reconnecting WhatsApp...');
    await this.disconnect();
    setTimeout(() => this.initialize(), 2000);
  }

  /**
   * Broadcast status update to all connected clients (SSE)
   */
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

  /**
   * Add SSE client
   * @param {object} client - Response object
   */
  addClient(client) {
    this.clients.push(client);
    console.log(`📡 Client connected. Total clients: ${this.clients.length}`);
  }

  /**
   * Remove SSE client
   * @param {object} client - Response object
   */
  removeClient(client) {
    this.clients = this.clients.filter(c => c !== client);
    console.log(`📡 Client disconnected. Total clients: ${this.clients.length}`);
  }

  /**
   * Get message history
   * @param {object} filter - Filter options
   * @param {number} limit - Limit results
   */
  async getMessages(filter = {}, limit = 50) {
    try {
      return await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Clear message queue
   */
  clearQueue() {
    const count = this.messageQueue.length;
    this.messageQueue = [];
    this.stats.totalPending = 0;
    console.log(`🗑️ Cleared ${count} queued messages`);
    return count;
  }
}

// Create singleton instance
// backend/src/services/whatsappService.js

const WhatsAppFactory = require('./gateway/WhatsAppFactory');

// ✅ Create instance based on env
const whatsappService = WhatsAppFactory.create();

// ✅ Export singleton (could be WABLAS or Baileys)
module.exports = whatsappService;

