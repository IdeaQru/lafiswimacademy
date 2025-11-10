// backend/src/services/whatsappGateway/WablasService.js

const axios = require('axios');
const IWhatsAppService = require('./IWhatsappService');
const Message = require('../../models/Message');
const fs = require('fs');  // ✅ ADD THIS IF MISSING
const path = require('path');
const FormData = require('form-data');
class WablasService extends IWhatsAppService {
  constructor() {
    super();
    this.token = process.env.WABLAS_TOKEN;
    this.secretKey = process.env.WABLAS_SECRET_KEY || '';
    this.server = process.env.WABLAS_SERVER || 'bdg.wablas.com';
    this.baseUrl = `https://${this.server}/api`;
    this.provider = 'wablas';
    
    console.log(`🟢 WABLAS Service initialized (${this.server})`);
    if (this.secretKey) {
      console.log(`🔐 Secret key enabled for security`);
    } else {
      console.warn(`⚠️ No secret key configured. IP whitelisting required.`);
    }
  }

  /**
   * Build authorization header (token + secret key)
   */
  getAuthHeader() {
    if (this.secretKey) {
      return `${this.token}.${this.secretKey}`;
    }
    return this.token;
  }

  /**
   * Initialize WABLAS connection (check status)
   */
 // backend/src/services/whatsappGateway/WablasService.js

// backend/src/services/whatsappGateway/WablasService.js

async initialize() {
  try {
    console.log('🔄 Initializing WABLAS service...');
    console.log(`   Server: ${this.server}`);
    console.log(`   Token: ${this.token ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Secret: ${this.secretKey ? '✅ Configured' : '⚠️ Optional'}`);
    
    if (!this.token) {
      throw new Error('WABLAS_TOKEN not configured in .env');
    }

    // ✅ Set as ready (status check not available in WABLAS)
    this.status = 'connected';
    this.phoneNumber = 'WABLAS Device';
    this.lastConnected = new Date();
    
    console.log(`✅ WABLAS Service Ready`);
    console.log(`   Dashboard: https://${this.server}/dashboard`);
    console.log(`   Status will be verified on message send`);
    
    // Load stats
    await this.loadStats();
    
    // Broadcast
    this.broadcastUpdate();
    
  } catch (error) {
    this.status = 'error';
    console.error('❌ WABLAS initialization failed:', error.message);
    this.broadcastUpdate();
  }
}
// backend/src/services/whatsappGateway/WablasService.js

/**
 * ✅ Send document (PDF, image, etc) via WABLAS
 */
async sendDocument(to, filePath, caption = '', metadata = {}) {
  try {
    const phoneNumber = this.normalizePhone(to);

    console.log(`📎 WABLAS: Sending document to ${phoneNumber}...`);
    console.log(`   File: ${filePath}`);
    console.log(`   Caption length: ${caption.length} chars`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create FormData
    const form = new FormData();
    form.append('phone', phoneNumber);
    form.append('document', fs.createReadStream(filePath));
    form.append('caption', caption);
    form.append('secret', 'false');

    // Send via WABLAS
    const response = await axios.post(
      `${this.baseUrl}/send-document`,
      form,
      {
        headers: {
          'Authorization': this.getAuthHeader(),
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log(`   📊 WABLAS Response:`, {
      status: response.data.status,
      phone: phoneNumber
    });

    if (response.data.status === true) {
      // Create message log
      const messageLog = await Message.create({
        recipient: phoneNumber,
        recipientName: metadata.recipientName || null,
        message: `[Document] ${caption}`,
        type: 'document',
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          ...metadata,
          provider: 'wablas',
          wablasMessageId: response.data.data?.id || null,
          documentPath: filePath,
          documentType: metadata.documentType || 'unknown'
        }
      });

      this.stats.totalSent++;
      this.broadcastUpdate();

      console.log(`✅ WABLAS: Document sent to ${metadata.recipientName || phoneNumber}`);

      return {
        success: true,
        messageId: messageLog._id,
        wablasMessageId: response.data.data?.id,
        message: 'Document sent successfully',
        recipient: phoneNumber,
        provider: 'wablas'
      };
    } else {
      throw new Error(response.data.message || 'WABLAS document send failed');
    }

  } catch (error) {
    console.error(`❌ WABLAS document send failed:`, error.message);
    this.stats.totalFailed++;
    this.broadcastUpdate();
    throw error;
  }
}



  /**
   * Disconnect (not applicable for WABLAS, but implemented for interface)
   */
  async disconnect() {
    console.log('🔴 WABLAS disconnect called (no action needed)');
    // WABLAS doesn't need manual disconnect
    // Device stays connected until unlinked from dashboard
    this.status = 'disconnected';
    this.broadcastUpdate();
  }

  /**
   * Normalize phone number for Indonesia
   */
  normalizePhone(phone) {
    let normalized = phone.replace(/[^0-9]/g, '');
    
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }

    return normalized;
  }

  /**
   * Send single message via WABLAS API
   * @override
   */
  async sendMessage(to, message, type = 'manual', sentBy = null, metadata = {}) {
    try {
      const phoneNumber = this.normalizePhone(to);

      console.log(`📤 WABLAS: Sending to ${phoneNumber}...`);

      // Create message log (pending)
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
          provider: 'wablas',
          wablasMessageId: null
        },
      });

      // ✅ Send via WABLAS API with secret key
      const response = await axios.post(
        `${this.baseUrl}/send-message`,
        new URLSearchParams({
          phone: phoneNumber,
          message: message,
          secret: 'false',
          retry: 'true',
          isGroup: 'false'
        }),
        {
          headers: {
            'Authorization': this.getAuthHeader(), // ✅ Use token.secretKey format
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Check response
      if (response.data.status === true) {
        // Update message log with success
        messageLog.status = 'sent';
        messageLog.sentAt = new Date();
        messageLog.metadata.wablasMessageId = response.data.data?.id || null;
        await messageLog.save();

        this.stats.totalSent++;
        this.broadcastUpdate();

        console.log(`✅ WABLAS: Message sent (ID: ${response.data.data?.id})`);

        return {
          success: true,
          messageId: messageLog._id,
          wablasMessageId: response.data.data?.id,
          message: 'Message sent successfully',
          recipient: phoneNumber,
          provider: 'wablas'
        };
      } else {
        throw new Error(response.data.message || 'WABLAS send failed');
      }

    } catch (error) {
      console.error('❌ WABLAS send error:', error.message);
      
      // ✅ Better error handling for 403
      if (error.response?.status === 403) {
        console.error('🚨 Access Denied (403):');
        console.error('   Message:', error.response?.data?.message);
        console.error('   Your IP:', error.response?.data?.whitelist_ip || 'Not whitelisted');
        console.error('');
        console.error('💡 Solutions:');
        console.error('   1. Add WABLAS_SECRET_KEY to .env');
        console.error('   2. Or whitelist IP in WABLAS dashboard');
        console.error('   3. Current auth:', this.secretKey ? 'Token + Secret Key' : 'Token only');
      }

      this.stats.totalFailed++;
      this.broadcastUpdate();

      // Update message log with error
      try {
        await Message.findOneAndUpdate(
          { recipient: this.normalizePhone(to), status: 'pending' },
          {
            status: 'failed',
            error: error.response?.data?.message || error.message
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
   * Send bulk messages with delay (WABLAS recommendation: 2 seconds)
   * @override
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

        // Delay 2 seconds between messages
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          success: false,
          to: msg.to,
          error: error.message,
          provider: 'wablas'
        });
      }
    }

    return results;
  }

  /**
   * Get current status (for controller /status endpoint)
   * @override
   */
  getStatus() {
    return {
      status: this.status,
      provider: 'wablas',
      server: this.server,
      qr: this.qr,
      phoneNumber: this.phoneNumber,
      lastConnected: this.lastConnected,
      uptime: this.lastConnected ? Date.now() - this.lastConnected.getTime() : 0,
      isReady: this.isReady(),
      queueLength: this.messageQueue.length,
      stats: this.stats,
      security: {
        secretKeyEnabled: !!this.secretKey,
        authMethod: this.secretKey ? 'Token + Secret Key' : 'Token only'
      }
    };
  }

  /**
   * Check if service is ready to send messages
   * @override
   */
  isReady() {
    return this.status === 'connected';
  }

  /**
   * Load statistics from database
   * @override
   */
  async loadStats() {
    try {
      const sentCount = await Message.countDocuments({ 
        status: 'sent',
        'metadata.provider': 'wablas'
      });
      const failedCount = await Message.countDocuments({ 
        status: 'failed',
        'metadata.provider': 'wablas'
      });
      const pendingCount = await Message.countDocuments({ 
        status: 'pending',
        'metadata.provider': 'wablas'
      });

      this.stats = {
        totalSent: sentCount,
        totalFailed: failedCount,
        totalPending: pendingCount,
      };
      
      console.log(`📊 WABLAS Stats loaded: Sent=${sentCount}, Failed=${failedCount}, Pending=${pendingCount}`);
    } catch (error) {
      console.error('Error loading WABLAS stats:', error);
    }
  }

  /**
   * Send image with caption (bonus feature)
   */
  async sendImage(to, imageUrl, caption = '') {
    try {
      const phoneNumber = this.normalizePhone(to);

      const response = await axios.post(
        `${this.baseUrl}/send-image`,
        new URLSearchParams({
          phone: phoneNumber,
          image: imageUrl,
          caption: caption
        }),
        {
          headers: {
            'Authorization': this.getAuthHeader(), // ✅ Use token.secretKey format
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ WABLAS send image error:', error);
      throw error;
    }
  }

  /**
   * Check phone number validity (bonus feature)
   */
  async checkPhone(phones) {
    try {
      const phoneList = Array.isArray(phones) ? phones.join(',') : phones;
      
      const response = await axios.post(
        `${this.baseUrl}/check-phone`,
        new URLSearchParams({
          phones: phoneList
        }),
        {
          headers: {
            'Authorization': this.getAuthHeader(), // ✅ Use token.secretKey format
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ WABLAS check phone error:', error);
      throw error;
    }
  }
}

module.exports = WablasService;
