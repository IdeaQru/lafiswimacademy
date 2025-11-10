// backend/src/services/whatsappGateway/WhatsAppFactory.js

const WablasService = require('./wablasService');
// const BaileysService = require('./BaileysService'); // Uncomment if you need fallback

class WhatsAppFactory {
  static create() {
    const provider = process.env.WA_PROVIDER || 'wablas';

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏭 WhatsApp Factory: Creating ${provider.toUpperCase()} service...`);
    console.log(`${'='.repeat(60)}\n`);

    switch (provider.toLowerCase()) {
      case 'wablas':
        return new WablasService();
      
      // case 'baileys':
      //   return new BaileysService();
      
      default:
        console.warn(`⚠️ Unknown provider: ${provider}. Using WABLAS as default.`);
        return new WablasService();
    }
  }
}

module.exports = WhatsAppFactory;
