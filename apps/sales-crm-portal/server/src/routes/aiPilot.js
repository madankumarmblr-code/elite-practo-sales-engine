import express from 'express';
import { store } from '../db/store.js';
import { generateDoctorPitch, simulateVoiceCallStream, analyzePractoLead } from '../services/aiPitchEngine.js';
import { rbacMiddleware, PERMISSIONS } from '../services/rbac.js';

export const aiPilotRouter = express.Router();

// Generate complete AI pitch suite for a specific lead
aiPilotRouter.post('/generate-pitch', (req, res) => {
  const { leadId, repName } = req.body;
  const lead = store.getLeadById(leadId) || store.getLeads()[0];
  if (!lead) return res.status(404).json({ error: 'No lead available' });

  const pitchSuite = generateDoctorPitch(lead, repName || 'Priya Sharma');
  res.json(pitchSuite);
});

// Simulate AI Voice Call Conversation
aiPilotRouter.post('/simulate-voice-call', (req, res) => {
  const { leadId } = req.body;
  const lead = store.getLeadById(leadId) || store.getLeads()[0];
  const transcript = simulateVoiceCallStream(lead);

  store.logAudit({
    action: 'AI_VOICE_CALL_SIMULATION',
    entity: `Simulated Autonomous AI SDR Call with ${lead.name} (${lead.organization})`,
    user: req.headers['x-user-name'] || 'AI Voice Agent',
    ip: 'Server-AI-Pilot',
    category: 'OUTREACH',
  });

  res.json({
    leadId: lead.id,
    doctorName: lead.name,
    organization: lead.organization,
    callDurationSeconds: 48,
    outcome: 'Demo Scheduled & WhatsApp Link Delivered',
    sentiment: 'Positive (88%)',
    transcript,
  });
});

// Autonomous Practo Lead Hunter (AI Pilot Job)
aiPilotRouter.post('/hunt-practo-leads', rbacMiddleware(PERMISSIONS.TRIGGER_AI_PILOT), (req, res) => {
  const { specialty = 'Cardiology', city = 'Mumbai', zone = 'Powai', count = 3 } = req.body;

  const mockDiscoveredLeads = [
    {
      id: `lead-pilot-${Date.now()}-1`,
      name: `Dr. Sameer Deshpande`,
      organization: `Deshpande ${specialty} & Diagnostic Hub`,
      specialty,
      category: 'Clinic',
      city,
      state: 'State',
      email: `dr.sameer@deshpandehub.in`,
      phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
      website: `https://deshpandehub.in`,
      patientVolumeMonthly: 1400,
      annualRevenueEstimate: 5600000,
      assignedRep: 'Ananya Roy',
      status: 'New Lead',
      stage: 'New Lead',
      score: 92,
      scoreBreakdown: { fit: 94, intent: 90, engagement: 88 },
      tags: ['AI Pilot Discovered', 'Practo High Rated', 'No-Show Pain Point'],
      notes: `Autonomous AI discovery from Practo directory in ${city}. High patient review count.`,
      timeline: [
        {
          id: `act-${Date.now()}`,
          type: 'lead_created',
          title: 'Discovered by Practo AI Pilot',
          description: `Identified high patient volume in ${specialty} with manual confirmation bottleneck.`,
          timestamp: new Date().toISOString(),
          user: 'Practo AI Hunter',
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: `lead-pilot-${Date.now()}-2`,
      name: `Dr. Kavita Singhania`,
      organization: `Singhania Advanced ${specialty} Care`,
      specialty,
      category: 'Specialty Center',
      city,
      state: 'State',
      email: `director@singhaniacare.org`,
      phone: `+91 97${Math.floor(10000000 + Math.random() * 90000000)}`,
      website: `https://singhaniacare.org`,
      patientVolumeMonthly: 1900,
      annualRevenueEstimate: 7600000,
      assignedRep: 'Priya Sharma',
      status: 'New Lead',
      stage: 'New Lead',
      score: 95,
      scoreBreakdown: { fit: 97, intent: 93, engagement: 91 },
      tags: ['AI Pilot Discovered', 'High Value', 'WhatsApp Pitch Ready'],
      notes: `High rating on Practo with 450+ patient reviews. Estimated monthly no-show loss: ₹2.4 Lakhs.`,
      timeline: [
        {
          id: `act-${Date.now() + 1}`,
          type: 'lead_created',
          title: 'Discovered by Practo AI Pilot',
          description: `Enriched with doctor specialty profile and automated revenue leakage calculation.`,
          timestamp: new Date().toISOString(),
          user: 'Practo AI Hunter',
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  mockDiscoveredLeads.forEach((lead) => store.createLead(lead));

  const jobRecord = {
    id: `pilot-job-${Date.now()}`,
    type: 'Practo Search & Enrichment',
    parameters: { specialty, city, count },
    leadsFound: mockDiscoveredLeads.length,
    status: 'Completed',
    timestamp: new Date().toISOString(),
  };
  store.createAiPilotJob(jobRecord);

  store.logAudit({
    action: 'AI_PILOT_HUNT_COMPLETED',
    entity: `Discovered ${mockDiscoveredLeads.length} new Practo leads for ${specialty} in ${city}`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'AI_PILOT',
  });

  res.json({
    message: `Discovered and enriched ${mockDiscoveredLeads.length} new Practo verified practices`,
    job: jobRecord,
    leads: mockDiscoveredLeads,
  });
});

// Launch Multi-Channel Pitch Campaign
aiPilotRouter.post('/launch-pitch-campaign', rbacMiddleware(PERMISSIONS.LAUNCH_OUTREACH), (req, res) => {
  const { leadIds, channels = ['whatsapp', 'email'], templateId } = req.body;
  if (!leadIds || !leadIds.length) {
    return res.status(400).json({ error: 'No leads selected for outreach' });
  }

  const dispatched = [];
  leadIds.forEach((leadId) => {
    const lead = store.getLeadById(leadId);
    if (lead) {
      const pitch = generateDoctorPitch(lead);
      store.updateLead(leadId, {
        status: 'Contacted',
        stage: lead.stage === 'New Lead' ? 'Contacted' : lead.stage,
        lastContacted: new Date().toISOString(),
      });
      dispatched.push({ leadId, name: lead.name, channels, preview: pitch.whatsappPitch.slice(0, 80) + '...' });
    }
  });

  store.logAudit({
    action: 'PITCH_CAMPAIGN_DISPATCHED',
    entity: `Dispatched multi-channel pitch sequence to ${dispatched.length} practices across [${channels.join(', ')}]`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'OUTREACH',
  });

  res.json({
    message: `Pitch campaign dispatched successfully to ${dispatched.length} recipients`,
    dispatched,
  });
});

// Execute single AI channel step (Voice Call, WhatsApp, Email, or Escalation)
aiPilotRouter.post('/execute-channel-step', async (req, res) => {
  const { leadId, channel, product = 'Practo Prime', repName = 'Ananya Roy' } = req.body;
  const lead = store.getLeadById(leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const pitchSuite = generateDoctorPitch(lead, repName);
  const timestamp = new Date().toISOString();
  let stepResult = {};

  if (channel === 'voice') {
    const transcript = simulateVoiceCallStream(lead);
    const callOutcome = lead.specialty?.includes('Cardio') || lead.specialty?.includes('Ortho')
      ? 'Demo Requested & Escalated to Field AE'
      : 'Demo Scheduled & WhatsApp Proposal Dispatched';

    // Check if voice conversation triggers escalation
    const isEscalated = callOutcome.includes('Escalated');

    const timelineEntry = {
      id: `act-voice-${Date.now()}`,
      type: 'voice_call',
      title: `AI Voice Outreach: ${product}`,
      description: `Autonomous Sarvam AI SDR called ${lead.phone}. Outcome: ${callOutcome}`,
      timestamp,
      user: 'AI Voice SDR',
    };

    const updates = {
      status: isEscalated ? 'Needs Human Intervention' : 'Contacted',
      stage: isEscalated ? 'Needs Human Intervention' : (lead.stage === 'New Lead' ? 'Contacted' : lead.stage),
      lastContacted: timestamp,
      timeline: [timelineEntry, ...(lead.timeline || [])],
    };

    if (isEscalated) {
      updates.needsHumanIntervention = true;
      updates.escalationDetails = {
        reason: 'Doctor requested customized multi-branch commercial terms and direct meeting with senior sales executive.',
        triggeredBy: 'AI Voice Call Interaction',
        recommendedAction: `Schedule on-site meeting with Dr. ${lead.name.replace('Dr. ', '')}. Present Practo Prime Supreme commercial proposal with customized quarterly payment terms.`,
        escalatedAt: timestamp,
        assignedRep: repName,
      };
    }

    store.updateLead(leadId, updates);

    stepResult = {
      channel: 'voice',
      status: 'Completed',
      outcome: callOutcome,
      isEscalated,
      transcript,
      callDurationSeconds: 42,
    };
  } else if (channel === 'whatsapp') {
    const timelineEntry = {
      id: `act-wa-${Date.now()}`,
      type: 'whatsapp_sent',
      title: `WhatsApp AI Pitch: ${product}`,
      description: `Interactive ROI Breakdown card and Practo Prime Supreme brochure sent to ${lead.phone}.`,
      timestamp,
      user: 'WhatsApp AI Agent',
    };

    store.updateLead(leadId, {
      status: lead.status === 'New Lead' ? 'Contacted' : lead.status,
      lastContacted: timestamp,
      timeline: [timelineEntry, ...(lead.timeline || [])],
    });

    stepResult = {
      channel: 'whatsapp',
      status: 'Delivered',
      messagePreview: pitchSuite.whatsappPitch,
      quickReplies: ['DEMO', 'SLOTS', 'REP'],
    };
  } else if (channel === 'email') {
    const timelineEntry = {
      id: `act-email-${Date.now()}`,
      type: 'email_sent',
      title: `Executive Proposal Email: ${product}`,
      description: `Dispatched formal commercial ROI proposal with slot lock-in contract link to ${lead.email}.`,
      timestamp,
      user: 'Email AI Engine',
    };

    store.updateLead(leadId, {
      status: 'Proposal Sent',
      stage: 'Proposal Sent',
      lastContacted: timestamp,
      timeline: [timelineEntry, ...(lead.timeline || [])],
    });

    stepResult = {
      channel: 'email',
      status: 'Sent',
      subject: pitchSuite.emailPitch.subject,
      bodyPreview: pitchSuite.emailPitch.body.slice(0, 300) + '...',
    };
  }

  store.logAudit({
    action: `AI_CHANNEL_${channel.toUpperCase()}_EXECUTED`,
    entity: `Executed AI ${channel} step for ${lead.name} (${lead.organization}) — ${product}`,
    user: req.headers['x-user-name'] || 'AI Pilot',
    ip: req.ip || '127.0.0.1',
    category: 'OUTREACH',
  });

  res.json({
    success: true,
    leadId,
    doctorName: lead.name,
    organization: lead.organization,
    stepResult,
    lead: store.getLeadById(leadId),
  });
});

// Full Autonomous Auto AI Pilot: Call → WhatsApp → Email → Conversion & Escalation
aiPilotRouter.post('/auto-pilot', (req, res) => {
  const { leadIds = [], product = 'Practo Prime', repName = 'Ananya Roy' } = req.body;
  if (!leadIds.length) {
    return res.status(400).json({ error: 'No clinics selected for Auto AI Pilot' });
  }

  const sequences = [];
  let escalatedCount = 0;
  let automatedSuccessCount = 0;

  leadIds.forEach((leadId, idx) => {
    const lead = store.getLeadById(leadId);
    if (!lead) return;

    const pitch = generateDoctorPitch(lead, repName);
    const timestamp = new Date().toISOString();

    // ~30% of high volume practices trigger human escalation for negotiation/custom pricing
    const requiresHumanEscalation = idx % 3 === 0 || (lead.patientVolumeMonthly && lead.patientVolumeMonthly > 2500);

    const timeline = [
      {
        id: `act-pilot-voice-${Date.now()}-${idx}`,
        type: 'voice_call',
        title: `AI Voice Outreach: ${product}`,
        description: `Autonomous Sarvam AI called doctor phone ${lead.phone}. Outcome: ${requiresHumanEscalation ? 'High-Value Pricing Question → Escalated to Field Rep' : 'Demonstration Interest Confirmed'}`,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: 'Sarvam Voice AI',
      },
      {
        id: `act-pilot-wa-${Date.now()}-${idx}`,
        type: 'whatsapp_sent',
        title: `WhatsApp AI Pitch: ${product}`,
        description: `Delivered Interactive ROI Card & 60-Second Video to ${lead.phone}.`,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        user: 'WhatsApp AI Agent',
      },
      {
        id: `act-pilot-email-${Date.now()}-${idx}`,
        type: 'email_sent',
        title: `Executive Commercial Proposal: ${product}`,
        description: `Sent proposal email with Practo Prime Supreme commercial terms and slot lock-in link to ${lead.email}.`,
        timestamp: new Date().toISOString(),
        user: 'Email AI Engine',
      },
      ...(lead.timeline || []),
    ];

    const updates = {
      status: requiresHumanEscalation ? 'Needs Human Intervention' : 'Proposal Sent',
      stage: requiresHumanEscalation ? 'Needs Human Intervention' : 'Proposal Sent',
      lastContacted: timestamp,
      timeline,
      tags: [...new Set([...(lead.tags || []), `Auto Pilot - ${product}`, requiresHumanEscalation ? '🚨 Escalated to Field AE' : 'AI Sequence Active'])],
    };

    if (requiresHumanEscalation) {
      escalatedCount++;
      updates.needsHumanIntervention = true;
      updates.escalationDetails = {
        reason: `Doctor requested custom multi-branch volume discount & dedicated consultation with senior field executive in ${lead.city}.`,
        triggeredBy: 'Autonomous AI Pilot Analysis',
        recommendedAction: `Call Dr. ${lead.name.replace('Dr. ', '')} directly at ${lead.phone}. Offer customized Practo Prime Supreme package terms and book on-site doctor demo.`,
        escalatedAt: timestamp,
        assignedRep: lead.assignedRep || repName,
      };
    } else {
      automatedSuccessCount++;
      updates.needsHumanIntervention = false;
    }

    const updatedLead = store.updateLead(leadId, updates);

    sequences.push({
      leadId,
      clinicName: lead.organization,
      doctorName: lead.name,
      product,
      requiresHumanEscalation,
      escalationDetails: updates.escalationDetails || null,
      stepsCompleted: [
        { step: 1, channel: 'Voice AI Call', status: 'Completed', result: 'Autonomous AI SDR Call Completed' },
        { step: 2, channel: 'WhatsApp AI', status: 'Delivered', result: 'ROI Calculator & Video Delivered' },
        { step: 3, channel: 'Email Proposal', status: 'Sent', result: 'Commercial Terms Dispatched' },
        {
          step: 4,
          channel: requiresHumanEscalation ? '🚨 Field Rep Handoff' : '🎯 AI Deal Closer',
          status: requiresHumanEscalation ? 'Escalated to Human' : 'Awaiting Doctor Sign-off',
          result: requiresHumanEscalation ? `Assigned to ${lead.assignedRep || repName} for direct closing` : 'Automated follow-up in 24h',
        },
      ],
    });
  });

  store.logAudit({
    action: 'AUTO_AI_PILOT_EXECUTED',
    entity: `Executed multi-channel AI Pilot for ${sequences.length} clinics. ${automatedSuccessCount} automated, ${escalatedCount} escalated to Field Reps.`,
    user: req.headers['x-user-name'] || 'Autonomous AI Engine',
    ip: req.ip || '127.0.0.1',
    category: 'AI_PILOT',
  });

  res.json({
    message: `Autonomous AI Pilot completed for ${sequences.length} practices. (${escalatedCount} routed to Human Field Reps for closing)`,
    product,
    totalProcessed: sequences.length,
    automatedSuccessCount,
    escalatedCount,
    sequences,
  });
});

// Explicit Manual/Rule-Based Human Escalation
aiPilotRouter.post('/escalate-to-human', (req, res) => {
  const { leadId, reason, repName = 'Ananya Roy', recommendedAction } = req.body;
  const lead = store.getLeadById(leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const timestamp = new Date().toISOString();
  const escalationReason = reason || 'Doctor requested customized pricing discussion with human account executive.';
  const repAction = recommendedAction || `Call Dr. ${lead.name.replace('Dr. ', '')} directly at ${lead.phone}. Provide on-site demo.`;

  const timelineEntry = {
    id: `act-esc-${Date.now()}`,
    type: 'escalation',
    title: '🚨 Escalated to Field Account Executive',
    description: `${escalationReason} Assigned to: ${repName}.`,
    timestamp,
    user: 'AI Supervisor',
  };

  const updatedLead = store.updateLead(leadId, {
    status: 'Needs Human Intervention',
    stage: 'Needs Human Intervention',
    needsHumanIntervention: true,
    escalationDetails: {
      reason: escalationReason,
      triggeredBy: 'Manual / AI Supervisor',
      recommendedAction: repAction,
      escalatedAt: timestamp,
      assignedRep: repName,
    },
    timeline: [timelineEntry, ...(lead.timeline || [])],
  });

  store.logAudit({
    action: 'LEAD_ESCALATED_TO_HUMAN',
    entity: `Escalated ${lead.name} (${lead.organization}) to Field Rep ${repName}. Reason: ${escalationReason}`,
    user: req.headers['x-user-name'] || 'AI Supervisor',
    ip: req.ip || '127.0.0.1',
    category: 'LEADS',
  });

  res.json({
    success: true,
    message: `Lead successfully escalated to Field Rep ${repName}`,
    lead: updatedLead,
  });
});

// Resolve Human Escalation & Hand back or Close
aiPilotRouter.post('/resolve-escalation', (req, res) => {
  const { leadId, newStage = 'Demo Scheduled', fieldNotes = '', outcome = 'resolved' } = req.body;
  const lead = store.getLeadById(leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const timestamp = new Date().toISOString();
  const timelineEntry = {
    id: `act-res-${Date.now()}`,
    type: 'note',
    title: `Field Rep Intervention Completed: ${newStage}`,
    description: `Field Rep logged notes: "${fieldNotes || 'Direct consultation completed successfully.'}" Outcome: ${outcome}`,
    timestamp,
    user: req.headers['x-user-name'] || lead.assignedRep || 'Field Sales Executive',
  };

  const updatedLead = store.updateLead(leadId, {
    status: newStage,
    stage: newStage,
    needsHumanIntervention: false,
    escalationDetails: null,
    timeline: [timelineEntry, ...(lead.timeline || [])],
  });

  store.logAudit({
    action: 'HUMAN_ESCALATION_RESOLVED',
    entity: `Field Rep resolved escalation for ${lead.name} → moved to ${newStage}`,
    user: req.headers['x-user-name'] || 'Field Rep',
    ip: req.ip || '127.0.0.1',
    category: 'LEADS',
  });

  res.json({
    success: true,
    message: `Escalation resolved! Lead updated to ${newStage}`,
    lead: updatedLead,
  });
});

// GET list of all escalated leads needing human intervention
aiPilotRouter.get('/escalations', (req, res) => {
  const escalatedLeads = store.getLeads((l) => l.needsHumanIntervention === true || l.stage === 'Needs Human Intervention');
  res.json({
    success: true,
    count: escalatedLeads.length,
    escalations: escalatedLeads,
  });
});
