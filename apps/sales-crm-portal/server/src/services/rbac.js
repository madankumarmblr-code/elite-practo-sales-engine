// Role-Based Access Control (RBAC) definitions & permission checks
export const ROLES = {
  SUPERADMIN: 'superadmin',
  SALES_MANAGER: 'sales_manager',
  ACCOUNT_EXECUTIVE: 'account_executive',
  SDR: 'sdr',
  AUDITOR: 'auditor',
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_LEADS: 'view_leads',
  EDIT_LEADS: 'edit_leads',
  UPDATE_LEADS: 'edit_leads', // Alias for EDIT_LEADS
  DELETE_LEADS: 'delete_leads',
  EXPORT_LEADS: 'export_leads',
  VIEW_PIPELINE: 'view_pipeline',
  EDIT_PIPELINE: 'edit_pipeline',
  TRIGGER_AI_PILOT: 'trigger_ai_pilot',
  LAUNCH_OUTREACH: 'launch_outreach',
  CUSTOM_REPORTS: 'custom_reports',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_TEAM: 'manage_team',
  MANAGE_PRIVACY: 'manage_privacy',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_UNMASKED_PII: 'view_unmasked_pii',
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: Object.values(PERMISSIONS),
  [ROLES.SALES_MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.UPDATE_LEADS,
    PERMISSIONS.EXPORT_LEADS,
    PERMISSIONS.VIEW_PIPELINE,
    PERMISSIONS.EDIT_PIPELINE,
    PERMISSIONS.TRIGGER_AI_PILOT,
    PERMISSIONS.LAUNCH_OUTREACH,
    PERMISSIONS.CUSTOM_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_UNMASKED_PII,
  ],
  [ROLES.ACCOUNT_EXECUTIVE]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.UPDATE_LEADS,
    PERMISSIONS.VIEW_PIPELINE,
    PERMISSIONS.EDIT_PIPELINE,
    PERMISSIONS.TRIGGER_AI_PILOT,
    PERMISSIONS.LAUNCH_OUTREACH,
    PERMISSIONS.CUSTOM_REPORTS,
    PERMISSIONS.VIEW_UNMASKED_PII,
  ],
  [ROLES.SDR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.UPDATE_LEADS,
    PERMISSIONS.VIEW_PIPELINE,
    PERMISSIONS.TRIGGER_AI_PILOT,
    PERMISSIONS.LAUNCH_OUTREACH,
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_PIPELINE,
    PERMISSIONS.CUSTOM_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_PRIVACY,
  ],
};

export function checkPermission(role, requiredPermission) {
  if (!requiredPermission) return true; // Safe guard against undefined permission checks
  const normalizedRole = (role || 'superadmin').toLowerCase();
  // Superadmin or admin has unconditional access to all operations
  if (normalizedRole === 'superadmin' || normalizedRole === 'admin') return true;
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes(requiredPermission);
}

export function rbacMiddleware(requiredPermission) {
  return (req, res, next) => {
    // Role can be passed via headers or auth payload
    const role = req.headers['x-user-role'] || req.user?.role || ROLES.SUPERADMIN;
    if (!checkPermission(role, requiredPermission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' does not have permission '${requiredPermission}'`,
        requiredPermission,
        currentRole: role,
      });
    }
    req.userRole = role;
    next();
  };
}

