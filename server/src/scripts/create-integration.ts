import mongoose from 'mongoose';
import { env } from '../config/env';
import { Integration } from '../modules/integrations/integration.model';
import { Brokerage } from '../modules/brokerages/brokerage.model';
import crypto from 'crypto';

async function generateIntegration() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    
    const brokerage = await Brokerage.findOne();
    
    if (!brokerage) {
      console.error('❌ No brokerage found. Please run the seed script first (npx tsx src/scripts/seed.ts)');
      process.exit(1);
    }

    const secretKey = `sec_${crypto.randomBytes(16).toString('hex')}`;
    
    const integration = await Integration.create({
      brokerageId: brokerage._id,
      type: 'Webhook',
      name: 'Postman Test Webhook',
      secretKey,
      active: true,
    });

    console.log('✅ Integration created successfully!');
    console.log('----------------------------------------------------');
    console.log(`Brokerage: ${brokerage.name}`);
    console.log(`Secret Key: ${integration.secretKey}`);
    console.log('----------------------------------------------------');
    console.log(`Use this URL in Postman: http://localhost:${env.PORT}/api/webhooks/leads/${integration.secretKey}`);
    
  } catch (error) {
    console.error('Error generating integration:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

generateIntegration();
