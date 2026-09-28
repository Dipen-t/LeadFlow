import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { Brokerage } from '../modules/brokerages/brokerage.model';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  
  let brokerage = await Brokerage.findOne({ slug: 'abc-mortgage' });
  if (!brokerage) {
    brokerage = await Brokerage.create({ name: 'ABC Mortgage', slug: 'abc-mortgage' });
  }

  // Create Platform Admin (System level)
  if (!(await User.findOne({ email: 'platform@leadflow.com' }))) {
    await User.create({
      brokerageId: null, // Platform admins don't belong to a single brokerage
      name: 'Platform Administrator',
      email: 'platform@leadflow.com',
      passwordHash: 'password123',
      role: 'PLATFORM_ADMIN',
    });
    console.log('Created platform@leadflow.com / password123 (PLATFORM_ADMIN)');
  }

  // Seed ABC Mortgage Users (Multiple Admins & Advisors under one tenant)
  const seedUsers = [
    { email: 'admin1@abc.com', name: 'Admin One', role: 'BROKERAGE_ADMIN' },
    { email: 'admin2@abc.com', name: 'Admin Two', role: 'BROKERAGE_ADMIN' },
    { email: 'advisor1@abc.com', name: 'Advisor One', role: 'ADVISOR' },
    { email: 'advisor2@abc.com', name: 'Advisor Two', role: 'ADVISOR' },
    { email: 'advisor3@abc.com', name: 'Advisor Three', role: 'ADVISOR' },
  ];

  for (const u of seedUsers) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create({
        brokerageId: brokerage._id,
        name: u.name,
        email: u.email,
        passwordHash: 'password123',
        role: u.role,
      });
      console.log(`Created ${u.email} / password123 (${u.role}) under ABC Mortgage`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }
  const { PipelineStage } = require('../modules/pipeline/pipelineStage.model');
  const stageCount = await PipelineStage.countDocuments({ brokerageId: brokerage._id });
  if (stageCount === 0) {
    await PipelineStage.insertMany([
      { brokerageId: brokerage._id, name: 'New', order: 0, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Contacted', order: 1, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Qualified', order: 2, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Application', order: 3, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Won', order: 4, category: 'WON' },
      { brokerageId: brokerage._id, name: 'Lost', order: 5, category: 'LOST' },
    ]);
    console.log('Created Pipeline Stages');
  } else {
    console.log('Pipeline stages already exist');
  }
  
  process.exit(0);
}

seed();
