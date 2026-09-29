import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { Brokerage } from '../modules/brokerages/brokerage.model';

const { PipelineStage } = require('../modules/pipeline/pipelineStage.model');
const { Lead } = require('../modules/leads/lead.model');
const { Task } = require('../modules/tasks/task.model');

async function seedBrokerage(name: string, slug: string, prefix: string) {
  let brokerage = await Brokerage.findOne({ slug });
  if (!brokerage) {
    brokerage = await Brokerage.create({ name, slug });
  }

  const seedUsers = [
    { email: `admin1@${prefix}.com`, name: 'Admin One', role: 'BROKERAGE_ADMIN' },
    { email: `admin2@${prefix}.com`, name: 'Admin Two', role: 'BROKERAGE_ADMIN' },
    { email: `advisor1@${prefix}.com`, name: 'Advisor One', role: 'ADVISOR' },
    { email: `advisor2@${prefix}.com`, name: 'Advisor Two', role: 'ADVISOR' },
    { email: `advisor3@${prefix}.com`, name: 'Advisor Three', role: 'ADVISOR' },
  ];

  for (const u of seedUsers) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create({
        brokerageId: brokerage._id,
        name: u.name,
        email: u.email,
        passwordHash: 'password123',
        role: u.role as any,
      });
      console.log(`Created ${u.email} / password123 (${u.role}) under ${name}`);
    }
  }

  let stages = await PipelineStage.find({ brokerageId: brokerage._id });
  if (stages.length === 0) {
    await PipelineStage.insertMany([
      { brokerageId: brokerage._id, name: 'New', order: 0, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Contacted', order: 1, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Qualified', order: 2, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Application', order: 3, category: 'OPEN' },
      { brokerageId: brokerage._id, name: 'Won', order: 4, category: 'WON' },
      { brokerageId: brokerage._id, name: 'Lost', order: 5, category: 'LOST' },
    ]);
    stages = await PipelineStage.find({ brokerageId: brokerage._id });
    console.log(`Created Pipeline Stages for ${name}`);
  }

  const advisors = await User.find({ brokerageId: brokerage._id, role: 'ADVISOR' });
  
  const existingLeads = await Lead.countDocuments({ brokerageId: brokerage._id });
  if (existingLeads === 0 && advisors.length > 0) {
    const leadsData = [];
    const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const sources = ['Website', 'Referral', 'Zillow', 'Google Ads'];

    for (let i = 0; i < 30; i++) {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      let status = 'ACTIVE';
      if (stage.category === 'WON') status = 'CONVERTED';
      if (stage.category === 'LOST') status = 'LOST';
      
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      leadsData.push({
        brokerageId: brokerage._id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
        source: sources[Math.floor(Math.random() * sources.length)],
        assignedAdvisorId: advisors[Math.floor(Math.random() * advisors.length)]._id,
        pipelineStageId: stage._id,
        status
      });
    }
    
    const createdLeads = await Lead.insertMany(leadsData);
    console.log(`Created ${createdLeads.length} leads for ${name}.`);
    
    const tasksData = [];
    const taskTitles = ['Follow up call', 'Send email', 'Collect documents', 'Schedule meeting', 'Review application'];
    
    for (const lead of createdLeads) {
      if (lead.status === 'ACTIVE' && Math.random() > 0.3) {
        tasksData.push({
          brokerageId: brokerage._id,
          leadId: lead._id,
          assignedAdvisorId: lead.assignedAdvisorId,
          title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
          dueAt: new Date(Date.now() + (Math.random() * 14 - 7) * 24 * 60 * 60 * 1000),
          status: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING'
        });
        
        if (Math.random() > 0.7) {
          tasksData.push({
            brokerageId: brokerage._id,
            leadId: lead._id,
            assignedAdvisorId: lead.assignedAdvisorId,
            title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
            dueAt: new Date(Date.now() + (Math.random() * 14) * 24 * 60 * 60 * 1000),
            status: 'PENDING'
          });
        }
      }
    }
    
    await Task.insertMany(tasksData);
    console.log(`Created ${tasksData.length} tasks for ${name}.`);
  }
}

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  
  if (!(await User.findOne({ email: 'platform@leadflow.com' }))) {
    await User.create({
      brokerageId: null,
      name: 'Platform Administrator',
      email: 'platform@leadflow.com',
      passwordHash: 'password123',
      role: 'PLATFORM_ADMIN',
    });
    console.log('Created platform@leadflow.com / password123 (PLATFORM_ADMIN)');
  }

  await seedBrokerage('ABC Mortgage', 'abc-mortgage', 'abc');
  await seedBrokerage('XYZ Realtors', 'xyz-realtors', 'xyz');

  process.exit(0);
}

seed();
