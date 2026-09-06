/**
 * Comprehensive Test Suite: Advanced Users & Permissions, RBAC, and Full Platform Verification
 */
import { createApp } from './backend/src/app.js';
import { bootstrap } from './backend/src/db/seed.js';
import db from './backend/src/db/db.js';
import { issueAuthToken } from './backend/src/auth/token.js';
import { hasPermission } from './backend/src/auth/roles.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✓ ${message}`);
    passed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 Starting Test Suite: Advanced Users, RBAC & All Modules');
  console.log('================================================================\n');

  // Initialize DB and Express app
  bootstrap();
  const app = createApp();

  // Helper for internal HTTP requests
  async function apiRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, async () => {
        const port = server.address().port;
        const url = `http://127.0.0.1:${port}${path}`;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
          const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
          const json = await res.json().catch(() => null);
          server.close(() => resolve({ status: res.status, ok: res.ok, data: json }));
        } catch (err) {
          server.close(() => reject(err));
        }
      });
    });
  }

  // Generate Admin Token
  const superAdmin = db.prepare("SELECT * FROM users WHERE role = 'superadmin' LIMIT 1").get();
  assert(Boolean(superAdmin), 'Super Admin account exists in database');
  const adminToken = issueAuthToken(superAdmin).token;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Role & Permission Catalog
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Testing Role & Granular Permission Catalog ---');
  const catalogRes = await apiRequest('GET', '/api/users/roles-permissions', null, adminToken);
  assert(catalogRes.status === 200, 'GET /api/users/roles-permissions returns 200');
  assert(Boolean(catalogRes.data?.roles?.sales_manager), 'Roles includes sales_manager');
  assert(Boolean(catalogRes.data?.roles?.ops_specialist), 'Roles includes ops_specialist');
  assert(Array.isArray(catalogRes.data?.permissions), 'Granular permissions catalog is an array');
  assert(catalogRes.data.permissions.some((p) => p.id === 'leads:import'), 'Permission leads:import exists');
  assert(catalogRes.data.permissions.some((p) => p.id === 'proposals:approve'), 'Permission proposals:approve exists');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Wildcard Permission Logic in roles.js
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Category Wildcard Matching ---');
  const mockUserWithWildcard = {
    role: 'sales_manager',
    permissions: ['leads:*', 'voice:*', 'dashboard:read'],
  };
  assert(hasPermission(mockUserWithWildcard, 'leads:read'), 'leads:* matches leads:read');
  assert(hasPermission(mockUserWithWildcard, 'leads:write'), 'leads:* matches leads:write');
  assert(hasPermission(mockUserWithWildcard, 'leads:delete'), 'leads:* matches leads:delete');
  assert(hasPermission(mockUserWithWildcard, 'voice:call'), 'voice:* matches voice:call');
  assert(!hasPermission(mockUserWithWildcard, 'users:delete'), 'mockUser cannot users:delete');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Advanced User Creation with Custom Permissions & Quotas
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Advanced User Creation ---');
  const testEmail = `priya.sharma_${Date.now()}@practo.com`;
  const createUserRes = await apiRequest('POST', '/api/users', {
    name: 'Priya Sharma',
    email: testEmail,
    username: `priya_${Date.now()}`,
    password: 'SecurePassword@123',
    role: 'sales_manager',
    department: 'Enterprise Healthcare BD',
    phone: '+919887766554',
    territory: ['Bangalore', 'Mumbai', 'Delhi NCR'],
    monthlyQuota: 120,
    dailyCallLimit: 150,
    canExport: true,
    canTriggerAutopilot: true,
    canApproveProposals: true,
    permissions: ['leads:*', 'voice:*', 'proposals:read', 'proposals:create', 'proposals:approve', 'dashboard:read'],
  }, adminToken);

  assert(createUserRes.status === 201, 'User created with 201 Created');
  const createdUser = createUserRes.data;
  assert(createdUser.name === 'Priya Sharma', 'User name matches');
  assert(createdUser.department === 'Enterprise Healthcare BD', 'User department matches');
  assert(createdUser.monthlyQuota === 120, 'Monthly quota is 120');
  assert(createdUser.dailyCallLimit === 150, 'Daily call limit is 150');
  assert(createdUser.canApproveProposals === true, 'Can approve proposals toggle is true');
  assert(Array.isArray(createdUser.territory) && createdUser.territory.includes('Mumbai'), 'Territory includes Mumbai');
  assert(createdUser.permissions.includes('leads:*'), 'Custom permissions includes leads:*');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: RBAC & Authenticated Action by New User
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Action by Newly Created User ---');
  const priyaDbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(createdUser.id);
  const priyaToken = issueAuthToken(priyaDbUser).token;

  // Priya has leads:* so she should be able to create a lead
  const leadCreateRes = await apiRequest('POST', '/api/leads', {
    name: 'Dr. Ramesh Rao',
    clinicName: 'Rao Orthopedic Centre',
    phone: '+919800112233',
    city: 'Bangalore',
    locality: 'Indiranagar',
    speciality: 'Orthopedic',
    productInterest: 'prime',
    workflowStage: 'manual',
  }, priyaToken);
  assert(leadCreateRes.status === 201, 'Sales manager with leads:* successfully creates lead (201)');

  // Priya does NOT have users:write / users:delete, so creating/deleting users must be forbidden
  const forbiddenCreateRes = await apiRequest('POST', '/api/users', {
    name: 'Unauthorized User',
    email: 'unauth@test.com',
    password: 'password123',
  }, priyaToken);
  assert(forbiddenCreateRes.status === 403, 'User without users:write is rejected with 403 Forbidden');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: User Settings Update (PUT and PATCH)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing User Settings & Permissions Update ---');
  const updateRes = await apiRequest('PUT', `/api/users/${createdUser.id}`, {
    monthlyQuota: 200,
    dailyCallLimit: 300,
    territory: ['Bangalore', 'Hyderabad', 'Pune'],
    canExport: false,
    permissions: ['leads:read', 'leads:write', 'voice:call', 'dashboard:read'],
  }, adminToken);

  assert(updateRes.status === 200, 'PUT /api/users/:id returns 200 OK');
  assert(updateRes.data.monthlyQuota === 200, 'Monthly quota updated to 200');
  assert(updateRes.data.dailyCallLimit === 300, 'Daily call limit updated to 300');
  assert(updateRes.data.canExport === false, 'canExport updated to false');
  assert(updateRes.data.territory.includes('Hyderabad'), 'Territory includes Hyderabad');
  assert(updateRes.data.permissions.includes('voice:call'), 'Permissions updated');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Password Reset & Login Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Admin Password Reset Endpoint ---');
  const resetPassRes = await apiRequest('POST', `/api/users/${createdUser.id}/reset-password`, {
    newPassword: 'BrandNewPassword@2026',
  }, adminToken);
  assert(resetPassRes.status === 200, 'Password reset returns 200 OK');

  const loginRes = await apiRequest('POST', '/api/auth/login', {
    email: testEmail,
    password: 'BrandNewPassword@2026',
  });
  assert(loginRes.status === 200, 'Login with new password succeeds (200 OK)');
  assert(Boolean(loginRes.data?.token), 'Login returns valid bearer token');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Safety Rules (Self-Delete & SuperAdmin Deletion Prevention)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing User Deletion Safeguards ---');
  const selfDeleteRes = await apiRequest('DELETE', `/api/users/${superAdmin.id}`, null, adminToken);
  assert(selfDeleteRes.status === 400, 'Self-deletion correctly rejected with 400 Bad Request');

  const superAdminDeleteRes = await apiRequest('DELETE', `/api/users/user_superadmin`, null, adminToken);
  assert(superAdminDeleteRes.status === 403 || superAdminDeleteRes.status === 400, 'Primary SuperAdmin deletion prevented (403/400)');

  const deleteTestUserRes = await apiRequest('DELETE', `/api/users/${createdUser.id}`, null, adminToken);
  assert(deleteTestUserRes.status === 200, 'Test user deleted successfully (200 OK)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Full Module Status Check ("Check if all works")
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Testing All Core Modules ---');

  // A. Leads CRM
  const leadsRes = await apiRequest('GET', '/api/leads?limit=5', null, adminToken);
  assert(leadsRes.status === 200 && Array.isArray(leadsRes.data?.leads), 'Leads CRM API returns 200 OK');

  // B. Autopilot Status & Queue
  const autopilotRes = await apiRequest('GET', '/api/autopilot/status', null, adminToken);
  assert(autopilotRes.status === 200, 'Autopilot status API returns 200 OK');

  // C. Voice Calls & Logs
  const voiceCallsRes = await apiRequest('GET', '/api/voice-agent/calls?limit=5', null, adminToken);
  assert(voiceCallsRes.status === 200 && (Array.isArray(voiceCallsRes.data?.calls) || Array.isArray(voiceCallsRes.data)), 'Voice Calls API returns 200 OK');

  // D. Commercial Proposals & Reach Inventory
  const proposalsRes = await apiRequest('GET', '/api/proposals?limit=5', null, adminToken);
  assert(proposalsRes.status === 200 && (Array.isArray(proposalsRes.data) || Array.isArray(proposalsRes.data?.proposals)), 'Proposals API returns 200 OK');

  // E. Integrations Check
  const integrationsRes = await apiRequest('GET', '/api/integrations', null, adminToken);
  assert(integrationsRes.status === 200 && (Array.isArray(integrationsRes.data) || Array.isArray(integrationsRes.data?.integrations)), 'Integrations API returns 200 OK');

  // F. Audit Logs
  const auditRes = await apiRequest('GET', '/api/audit?limit=5', null, adminToken);
  assert(auditRes.status === 200 && (Array.isArray(auditRes.data) || Array.isArray(auditRes.data?.logs)), 'Audit logs API returns 200 OK');

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS COMPLETED! Passed: ${passed}, Failed: ${failed}`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch((e) => {
  console.error('Fatal test runner failure:', e);
  process.exit(1);
});
