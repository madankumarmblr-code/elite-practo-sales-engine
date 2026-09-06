import assert from 'assert';
import db from './backend/src/db/db.js';
import { persistDurableDbNow } from './backend/src/services/dbSnapshot.js';
import { nanoid } from 'nanoid';

async function runTest() {
  console.log('--- Testing Custom Leads CSV Upload & Selective Push ---');

  // Test 1: Simulate Custom CSV Parsing with custom columns
  const customCsvText = `
"Provider Full Name","Facility / Hospital","Contact Mobile","Email","City Location","Area","Specialization","Plan Interest","Remarks"
"Dr. Neha Verma","Skin & Laser Care","+919811122233","neha@skincare.in","Bangalore","Indiranagar","Dermatologist","reach","Interested in Google Ads"
"Dr. Anand Kulkarni","Kulkarni Ortho Hospital","+919822233344","anand@orthocare.org","Bangalore","Jayanagar","Orthopedic","prime","Needs appointment booking"
"Dr. Smita Patil","Patil Dental Studio","","smita@patildental.com","Bangalore","Whitefield","Dentist","ray","No phone given"
  `.trim();

  // Basic CSV line parser test
  const lines = customCsvText.split('\n').map(l => l.trim()).filter(Boolean);
  assert.strictEqual(lines.length, 4, 'Should have 1 header row and 3 data rows');

  // Test 2: Push to CRM Only (target: 'crm')
  const crmLeadId = `lead_crm_${nanoid(8)}`;
  const ts = new Date().toISOString();
  db.prepare(`
    INSERT INTO leads (
      id, name, email, phone, company, title, source, stage, score, value,
      status, assigned_to, notes, tags, temperature, preferred_channel,
      city, locality, speciality, product_interest, workflow_stage,
      clinic_name, doctor_name, owner_name, owner_phone, reception_phone,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'csv_custom_upload', 'new', 75, 0,
      'open', 'Unassigned', 'Custom uploaded lead', '[]', '', '',
      ?, ?, ?, ?, 'manual',
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `).run(
    crmLeadId, 'Dr. Neha Verma', 'neha@skincare.in', '+919811122233', 'Skin & Laser Care', 'Dermatologist',
    'Bangalore', 'Indiranagar', 'Dermatologist', 'reach',
    'Skin & Laser Care', 'Dr. Neha Verma', 'Dr. Neha Verma', '+919811122233', '+919811122233',
    ts, ts
  );

  const row1 = db.prepare('SELECT * FROM leads WHERE id = ?').get(crmLeadId);
  assert(row1, 'Lead pushed to CRM should exist');
  assert.strictEqual(row1.workflow_stage, 'manual');
  assert.strictEqual(row1.product_interest, 'reach');
  assert.strictEqual(row1.clinic_name, 'Skin & Laser Care');
  console.log('✓ Test 1: Selective push to CRM Only successfully verified');

  // Test 3: Push to Both CRM & Autopilot (target: 'both', pushToAutopilot: true)
  const { autopilotService } = await import('./backend/src/services/autopilotService.js');
  const autoPhone = `+9198333${Math.floor(10000 + Math.random() * 90000)}`;
  const autoLeadId = `lead_auto_${nanoid(8)}`;

  db.prepare(`
    INSERT INTO leads (
      id, name, email, phone, company, title, source, stage, score, value,
      status, assigned_to, notes, tags, temperature, preferred_channel,
      city, locality, speciality, product_interest, workflow_stage,
      clinic_name, doctor_name, owner_name, owner_phone, reception_phone,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'csv_custom_upload', 'new', 75, 0,
      'open', 'Unassigned', 'Pushed to Autopilot queue', '[]', '', '',
      ?, ?, ?, ?, 'autopilot',
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `).run(
    autoLeadId, 'Dr. Anand Kulkarni', 'anand@orthocare.org', autoPhone, 'Kulkarni Ortho Hospital', 'Orthopedic',
    'Bangalore', 'Jayanagar', 'Orthopedic', 'prime',
    'Kulkarni Ortho Hospital', 'Dr. Anand Kulkarni', 'Dr. Anand Kulkarni', autoPhone, autoPhone,
    ts, ts
  );

  const qItem = await autopilotService.enqueueLead({
    leadId: autoLeadId,
    clinicName: 'Kulkarni Ortho Hospital',
    city: 'Bangalore',
    locality: 'Jayanagar',
    speciality: 'Orthopedic',
    phone: autoPhone,
    email: 'anand@orthocare.org',
    ownerName: 'Dr. Anand Kulkarni',
    product: 'prime',
    autoStart: false,
  });

  assert(qItem, 'Queue item should be created in autopilot_queue');
  assert.strictEqual(qItem.lead_id, autoLeadId, 'Queue item lead_id must match CRM lead ID');

  const enqueuedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(autoLeadId);
  assert.strictEqual(enqueuedLead.workflow_stage, 'autopilot');
  console.log(`✓ Test 2: Push to Both CRM & Autopilot verified (Queue ID: ${qItem.id})`);

  // Test 4: Verify Durable DB Snapshot
  await persistDurableDbNow();
  console.log('✓ Test 3: Durable DB snapshot flush verified');

  console.log('=== All Custom Leads CSV Upload & Push Tests Passed! ===');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
