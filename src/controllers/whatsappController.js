const whatsappService = require('../services/whatsappService');
const Message = require('../models/Message');
// backend/src/controllers/whatsappController.js


/**
 * @desc    Get WhatsApp connection status
 * @route   GET /api/whatsapp/status
 * @access  Public
 */
exports.getStatus = (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Connect WhatsApp (WABLAS specific)
 * @route   POST /api/whatsapp/connect
 * @access  Private (Admin only)
 */
exports.connect = async (req, res) => {
  try {
    if (whatsappService.status === 'connected') {
      return res.json({
        success: true,
        message: 'WhatsApp already connected via WABLAS',
        data: whatsappService.getStatus(),
      });
    }

    await whatsappService.initialize();
    
    const isConnected = whatsappService.status === 'connected';
    
    res.json({
      success: isConnected,
      message: isConnected 
        ? 'WABLAS connected successfully' 
        : `Please scan QR code at: https://${process.env.WABLAS_SERVER}/dashboard`,
      data: whatsappService.getStatus(),
    });
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Disconnect WhatsApp (WABLAS specific)
 * @route   POST /api/whatsapp/disconnect
 * @access  Private (Admin only)
 */
exports.disconnect = async (req, res) => {
  try {
    await whatsappService.disconnect();
    
    res.json({
      success: true,
      message: 'WABLAS service disconnected locally',
      note: 'Device remains linked in WABLAS dashboard. To fully disconnect, unlink from dashboard.',
      data: whatsappService.getStatus()
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Clear session (Not applicable for WABLAS)
 * @route   POST /api/whatsapp/clear-session
 * @access  Public
 */
exports.clearSession = async (req, res) => {
  try {
    if (process.env.WA_PROVIDER === 'wablas') {
      return res.status(400).json({
        success: false,
        message: 'Clear session not applicable for WABLAS',
        data: {
          provider: 'wablas',
          solution: 'To reset connection: Login to WABLAS dashboard → Unlink device → Scan QR again',
          dashboard: `https://${process.env.WABLAS_SERVER}/dashboard`
        }
      });
    }

    // Baileys fallback (if ever needed)
    const fs = require('fs');
    const path = require('path');
    
    await whatsappService.disconnect();
    
    const sessionPath = path.join(__dirname, '../../sessions/lafi');
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('🗑️  Session files deleted');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await whatsappService.initialize();
    
    res.json({
      success: true,
      message: 'Session cleared successfully',
    });
  } catch (error) {
    console.error('Clear session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.sendMessage = async (req, res) => {
  try {
    const { to, message, type, metadata } = req.body;

    // Validation
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
      });
    }

    if (message.length > 4096) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long (max 4096 characters)',
      });
    }

    // Send message with user context
    const result = await whatsappService.sendMessage(
      to, 
      message, 
      type || 'manual',
      req.user?.id,
      {
        ...metadata,
        sentByName: req.user?.fullName,
        sentByEmail: req.user?.email,
      }
    );
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Send bulk messages
 * @route   POST /api/whatsapp/send-bulk
 * @access  Private (Admin & Instructor)
 */
exports.sendBulkMessages = async (req, res) => {
  try {
    const { messages } = req.body;

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required and cannot be empty',
      });
    }

    if (messages.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 messages per request',
      });
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.to || !msg.message) {
        return res.status(400).json({
          success: false,
          message: 'Each message must have "to" and "message" fields',
        });
      }
    }

    const results = await whatsappService.sendBulkMessages(
      messages, 
      req.user?.id
    );
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Sent ${successCount} messages, ${failedCount} failed`,
      data: {
        total: messages.length,
        success: successCount,
        failed: failedCount,
        results,
      },
    });
  } catch (error) {
    console.error('Send bulk messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get message history with filters
 * @route   GET /api/whatsapp/messages
 * @access  Private
 */
exports.getMessageHistory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      type,
      recipient,
      startDate,
      endDate,
      sentBy,
      search,
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (recipient) query.recipient = { $regex: recipient, $options: 'i' };
    if (sentBy) query.sentBy = sentBy;
    
    if (search) {
      query.$or = [
        { recipient: { $regex: search, $options: 'i' } },
        { recipientName: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const limitInt = Math.min(parseInt(limit), 100); // Max 100 per page

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitInt)
        .populate('sentBy', 'fullName email role')
        .lean(),
      Message.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: limitInt,
          total,
          pages: Math.ceil(total / limitInt),
          hasMore: skip + messages.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Get message history error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get message by ID
 * @route   GET /api/whatsapp/messages/:id
 * @access  Private
 */
exports.getMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id)
      .populate('sentBy', 'fullName email role')
      .lean();

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Get message by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get message statistics
 * @route   GET /api/whatsapp/messages/stats
 * @access  Private
 */
exports.getMessageStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    const [
      totalMessages,
      periodMessages,
      statusCounts,
      typeCounts,
      recentMessages,
      topRecipients,
    ] = await Promise.all([
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: startDate } }),
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Message.find({ createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('recipient recipientName message status createdAt')
        .lean(),
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$recipient', count: { $sum: 1 }, recipientName: { $first: '$recipientName' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Calculate success rate
    const sentCount = statusCounts.find(s => s._id === 'sent')?.count || 0;
    const failedCount = statusCounts.find(s => s._id === 'failed')?.count || 0;
    const successRate = periodMessages > 0 
      ? ((sentCount / periodMessages) * 100).toFixed(2) 
      : 0;

    const stats = {
      total: totalMessages,
      period: {
        name: period,
        count: periodMessages,
        startDate,
      },
      successRate: parseFloat(successRate),
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {
        sent: 0,
        failed: 0,
        pending: 0,
        delivered: 0,
        read: 0,
      }),
      byType: typeCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {
        notification: 0,
        reminder: 0,
        broadcast: 0,
        manual: 0,
      }),
      recentMessages,
      topRecipients: topRecipients.map(r => ({
        phone: r._id,
        name: r.recipientName,
        count: r.count,
      })),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get daily statistics for chart
 * @route   GET /api/whatsapp/messages/stats/daily
 * @access  Private
 */
exports.getDailyStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysInt = Math.min(parseInt(days), 90); // Max 90 days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Transform data for chart
    const dateMap = {};
    dailyStats.forEach(stat => {
      const date = stat._id.date;
      if (!dateMap[date]) {
        dateMap[date] = { date, sent: 0, failed: 0, pending: 0, delivered: 0, read: 0 };
      }
      dateMap[date][stat._id.status] = stat.count;
    });

    const chartData = Object.values(dateMap);

    res.json({
      success: true,
      data: {
        days: daysInt,
        startDate,
        endDate: new Date(),
        stats: chartData,
      },
    });
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Retry failed message
 * @route   POST /api/whatsapp/messages/:id/retry
 * @access  Private
 */
exports.retryMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (message.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Only failed messages can be retried',
      });
    }

    // Retry sending
    const result = await whatsappService.sendMessage(
      message.recipient,
      message.message,
      message.type,
      req.user?.id,
      message.metadata
    );

    // Delete old message log
    await Message.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Message retried successfully',
      data: result,
    });
  } catch (error) {
    console.error('Retry message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete message log
 * @route   DELETE /api/whatsapp/messages/:id
 * @access  Private (Admin only)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndDelete(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Clear all message logs
 * @route   DELETE /api/whatsapp/messages
 * @access  Private (Admin only)
 */
exports.clearMessages = async (req, res) => {
  try {
    const { status, olderThan } = req.query;

    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (olderThan) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(olderThan));
      query.createdAt = { $lt: date };
    }

    const result = await Message.deleteMany(query);

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} messages`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error('Clear messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Server-Sent Events stream for real-time updates
 * @route   GET /api/whatsapp/stream
 * @access  Public
 */
exports.stream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial status
  const initialData = JSON.stringify(whatsappService.getStatus());
  res.write(`data: ${initialData}\n\n`);

  // Add client to service
  whatsappService.addClient(res);

  // Remove client on disconnect
  req.on('close', () => {
    whatsappService.removeClient(res);
  });
};

/**
 * @desc    Send template message
 * @route   POST /api/whatsapp/send-template
 * @access  Private
 */
exports.sendTemplateMessage = async (req, res) => {
  try {
    const { templateName, recipients, variables } = req.body;

    // Validation
    if (!templateName || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        message: 'Template name and recipients array are required',
      });
    }

    // Load template (you can store templates in database)
    const templates = {
      'class-reminder': 'Halo {name}, ini adalah pengingat untuk kelas {className} pada {date} pukul {time}. Terima kasih!',
      'payment-reminder': 'Halo {name}, pembayaran untuk bulan {month} sebesar Rp {amount} belum kami terima. Mohon segera melakukan pembayaran.',
      'new-schedule': 'Halo {name}, jadwal kelas baru telah ditambahkan: {className} - {schedule}. Silakan konfirmasi kehadiran Anda.',
    };

    const template = templates[templateName];

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Prepare messages
    const messages = recipients.map(recipient => {
      let message = template;
      
      // Replace variables
      if (variables && variables[recipient.phone]) {
        const vars = variables[recipient.phone];
        Object.keys(vars).forEach(key => {
          message = message.replace(new RegExp(`{${key}}`, 'g'), vars[key]);
        });
      }

      return {
        to: recipient.phone,
        message,
        type: 'notification',
        metadata: {
          recipientName: recipient.name,
          templateName,
        },
      };
    });

    // Send bulk messages
    const results = await whatsappService.sendBulkMessages(messages, req.user?.id);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Template sent to ${successCount} recipients, ${failedCount} failed`,
      data: {
        template: templateName,
        total: recipients.length,
        success: successCount,
        failed: failedCount,
        results,
      },
    });
  } catch (error) {
    console.error('Send template message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
