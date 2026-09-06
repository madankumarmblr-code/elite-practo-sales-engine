import assert from 'assert';
import db from './backend/src/db/db.js';
import { autopilotService } from './backend/src/services/autopilotService.js';
import { voiceAgentService } from './backend/src/services/voiceAgentService.js';
import { persistDurableDbNow } from './backend/src/services/dbSnapshot.js';
import { nanoid } from 'nanoid';

async function runTest() {
  console.log('--- Starting Lead Persistence & Autopilot Status Test ---');

  // Test 1: Manual Lead Creation with full fields
  const testId1 = `test_manual_${nanoid(8)}`;
  const ts = new Date().toISOString();
  db.prepare(`
    INSERT INTO leads (
      id, name, email, phone, company, title, source, stage, score, value,
      status, assigned_to, notes, tags, temperature, preferred_channel,
      city, locality, speciality, on_practo, practo_rating, practo_reviews, practo_url,
      owner_name, owner_phone, owner_email, marketing_name, marketing_phone, marketing_email,
      reception_phone, product_interest, workflow_stage, clinic_name, doctor_name, address,
      next_action, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 0, 0, 0, '',
      ?, ?, ?, '', '', '',
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    testId1, 'Dr. Ramesh Rao', 'ramesh@care.com', '+919811122233', 'Rao Care Clinic', 'Cardiologist',
    'manual', 'new', 85, 0, 'open', 'Unassigned', 'High patient volume', '[]', 'warm', 'call',
    'Bangalore', 'Indiranagar', 'Cardiology',
    'Dr. Ramesh Rao', '+919811122233', 'ramesh@care.com',
    '+919811122233', 'reach', 'manual', 'Rao Care Clinic', 'Dr. Ramesh Rao', '100ft Road',
    'Awaiting initial outreach', ts, ts
  );

  const row1 = db.prepare('SELECT * FROM leads WHERE id = ?').get(testId1);
  assert(row1, 'Lead 1 should exist');
  assert.strictEqual(row1.city, 'Bangalore');
  assert.strictEqual(row1.locality, 'Indiranagar');
  assert.strictEqual(row1.speciality, 'Cardiology');
  assert.strictEqual(row1.product_interest, 'reach');
  assert.strictEqual(row1.workflow_stage, 'manual');
  console.log('✓ Test 1: Manual lead insertion with full fields passed');

  // Test 2: Autopilot Enqueue WITHOUT pre-existing lead (Auto-upsert test)
  const autoPhone = `+9199000${Math.floor(10000 + Math.random() * 90000)}`;
  const autoClinic = `Apex Health ${nanoid(4)}`;
  const autoDoctor = 'Dr. Priya Sharma';

  const qItem = await autopilotService.enqueueLead({
    clinicName: autoClinic,
    ownerName: autoDoctor,
    phone: autoPhone,
    city: 'Bangalore',
    locality: 'Koramangala',
    speciality: 'Dermatologist',
    product: 'prime',
    autoStart: false,
  });

  assert(qItem, 'Autopilot queue item should be created');
  assert(qItem.lead_id, 'Queue item MUST have a valid lead_id assigned');

  const autoLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(qItem.lead_id);
  assert(autoLead, 'A corresponding lead record MUST be auto-created in leads table');
  assert.strictEqual(autoLead.workflow_stage, 'autopilot');
  assert.strictEqual(autoLead.product_interest, 'prime');
  assert.strictEqual(autoLead.company, autoClinic);
  console.log(`✓ Test 2: Autopilot auto-upserted lead ${autoLead.id} for clinic ${autoClinic}`);

  // Test 3: Trigger Voice Call and verify stage progression
  console.log('Triggering AI Call on enqueued item...');
  await autopilotService.triggerVoiceCall(qItem.id);

  const contactedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(qItem.lead_id);
  assert(['proposal_sent', 'closed_won', 'negotiation', 'contacted'].includes(contactedLead.stage), `Expected progressed stage, got: ${contactedLead.stage}`);
  assert(['contacted', 'won', 'proposal_sent', 'requires_attention', 'follow_up'].includes(contactedLead.status), `Expected active status, got: ${contactedLead.status}`);
  assert(contactedLead.last_contacted_at, 'last_contacted_at should be populated');
  assert(contactedLead.value > 0, `Proposal value should be > 0, got: ${contactedLead.value}`);
  console.log(`✓ Test 3: Lead stage progressed to ${contactedLead.stage} (status: ${contactedLead.status}, value: ₹${contactedLead.value})`);

  // Test 4: Direct Voice Agent Dialing without pre-existing lead
  const directPhone = `+9198777${Math.floor(10000 + Math.random() * 90000)}`;
  const dialResult = await voiceAgentService.placeVoiceCall({
    toPhone: directPhone,
    doctorName: 'Dr. Siddharth Varma',
    clinicName: 'Varma Diagnostics',
    city: 'Bangalore',
    locality: 'Whitefield',
    speciality: 'Radiologist',
    product: 'reach',
    voiceEngine: 'native',
    telephonyProviderName: 'simulator',
  });

  assert(dialResult.callId, 'Voice call should return callId');
  const cleanLast10 = directPhone.slice(-10);
  const directLead = db.prepare('SELECT * FROM leads WHERE phone LIKE ?').get(`%${cleanLast10}`);
  assert(directLead, 'Voice call without leadId MUST auto-create lead in CRM');
  assert.strictEqual(directLead.status, 'contacted');
  assert(directLead.last_contacted_at, 'last_contacted_at must be set');
  console.log(`✓ Test 4: Direct dialer auto-created lead ${directLead.id} with status contacted`);

  // Test 5: Durable snapshot flush
  await persistDurableDbNow();
  console.log('✓ Test 5: Durable snapshot persisted successfully');

  console.log('=== All Lead Persistence & Autopilot Status Tests Passed Successfully! ===');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
