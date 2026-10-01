import mongoose from 'mongoose';
import { Brokerage } from './src/modules/brokerages/brokerage.model';
import { PipelineStage } from './src/modules/pipeline/pipelineStage.model';

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/unsquare');
    console.log('Connected');

    const brokerage = await Brokerage.create({
      name: 'Test Brokerage ' + Date.now(),
      slug: 'test-brokerage-' + Date.now(),
    });

    console.log('Brokerage created', brokerage._id);

    await PipelineStage.insertMany([
      { brokerageId: brokerage._id, name: 'NEW', order: 0, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'CONTACTED', order: 1, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'QUALIFIED', order: 2, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'WON', order: 3, category: 'WON' },
      { brokerageId: brokerage._id, name: 'LOST', order: 4, category: 'LOST' }
    ]);

    console.log('Stages created');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

test();
