import { Request, Response, NextFunction } from 'express';
import { Client } from './client.model';
import { Lead } from '../leads/lead.model';
import { User } from '../users/user.model';
import { NotFoundError, AppError } from '../../utils/errors';
import { broadcastToBrokerage } from '../../sockets';
import crypto from 'crypto';

export const convertLeadToClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { leadId } = req.params;

    // 1. Validate Lead
    const lead = await Lead.findOne({ _id: leadId, brokerageId });
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // 2. Idempotency Check: Already converted?
    if (lead.status === 'CONVERTED') {
      const existingClient = await Client.findOne({ leadId: lead._id });
      if (!existingClient) {
        throw new AppError('Lead is marked as converted but Client record is missing', 500);
      }
      return res.status(200).json({
        status: 'success',
        message: 'Lead was already converted',
        data: { client: existingClient },
      });
    }

    // 3. Create Client User (Auth Account)
    const email = lead.email || `client-${lead._id}@pending-setup.com`;
    
    // Check if user already exists (maybe they were a client before)
    let user = await User.findOne({ email, brokerageId });
    
    if (user && user.role !== 'CLIENT') {
      throw new AppError('Cannot convert lead because this email is already registered as a staff account.', 409);
    }
    
    let generatedPassword = null;
    
    if (!user) {
      generatedPassword = crypto.randomBytes(8).toString('hex');
      user = await User.create({
        brokerageId,
        role: 'CLIENT',
        name: `${lead.firstName} ${lead.lastName}`,
        email: email,
        passwordHash: generatedPassword, // Hook hashes this automatically
        status: 'ACTIVE',
      });
    }

    // 4. Create Client Record
    let client;
    try {
      client = await Client.create({
        brokerageId,
        leadId: lead._id,
        userId: user._id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: email,
        phone: lead.phone,
      });
    } catch (createErr: any) {
      if (createErr.code === 11000) {
        // Edge Case: Concurrency (Rapid double-click on convert button). 
        // Another thread just created the client. Fetch it and return 200 OK.
        const existingClient = await Client.findOne({ leadId: lead._id });
        return res.status(200).json({
          status: 'success',
          message: 'Lead was already converted concurrently',
          data: { client: existingClient },
        });
      }
      throw createErr;
    }

    // 5. Update Lead Status
    lead.status = 'CONVERTED';
    await lead.save();

    // 6. Broadcast Realtime Event
    broadcastToBrokerage(brokerageId.toString(), 'lead.converted', { client, leadId: lead._id });

    // For MVP, we return the generated password to the frontend so the advisor can securely copy and send it to the client.
    res.status(201).json({
      status: 'success',
      data: {
        client,
        temporaryPassword: generatedPassword, 
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const clients = await Client.find({ brokerageId });
    
    res.json({
      status: 'success',
      data: { clients },
    });
  } catch (err) {
    next(err);
  }
};
