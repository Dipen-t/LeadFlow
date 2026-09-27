import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { Brokerage } from '../modules/brokerages/brokerage.model';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  
  let brokerage = await Brokerage.findOne({ name: 'Admin Brokerage' });
  if (!brokerage) {
    brokerage = await Brokerage.create({ name: 'Admin Brokerage', slug: 'admin-brokerage' });
  }

  const existing = await User.findOne({ email: 'admin@leadflow.com' });
  if (!existing) {
    await User.create({
      brokerageId: brokerage._id,
      name: 'System Admin',
      email: 'admin@leadflow.com',
      passwordHash: 'password123',
      role: 'BROKERAGE_ADMIN',
    });
    console.log('Created admin@leadflow.com / password123');
  } else {
    console.log('Admin already exists: admin@leadflow.com / password123');
  }
  
  process.exit(0);
}

seed();
