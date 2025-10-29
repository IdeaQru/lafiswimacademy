const express = require('express');
const router = express.Router();
const {
  getStatus,
  connect,
  disconnect,
  sendMessage,
  sendBulkMessages,
  getMessageHistory,
  stream,
  clearSession,

} = require('../controllers/whatsappController');
const { validateApiKey } = require('../middleware/apiKeyMiddleware');

// =====================================
// PUBLIC ROUTES (No Authentication)
// =====================================
router.post('/clear-session', clearSession);
// Get WhatsApp status
router.get('/status', getStatus);

// Real-time updates via Server-Sent Events
router.get('/stream', stream);

// Connect WhatsApp (Public for GUI)
router.post('/connect-public', connect);

// Disconnect WhatsApp (Public for GUI)
router.post('/disconnect-public', disconnect);

// =====================================
// API KEY PROTECTED ROUTES
// =====================================

// Send single message (with API Key)
router.post('/send', validateApiKey, sendMessage);

// Send bulk messages (with API Key)
router.post('/send-bulk', validateApiKey, sendBulkMessages);

// Get message history (with API Key)
router.get('/messages', validateApiKey, getMessageHistory);

module.exports = router;
