// Seeds the built-in permission catalogue and role templates. Safe to run repeatedly.
// Accounts are NOT seeded: platform admins and merchant owners are created through invitation flows
// (a later step), and no default passwords ever exist.
import { PrismaClient, RoleScope } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS: Record<string, string> = {
  'merchants.manage': 'Create, invite and change the status of merchants',
  'plans.manage': 'Manage subscription plans',
  'audit.read': 'Read the audit log',
  'merchant.settings.manage': 'Edit merchant profile, branding and settings',
  'branches.manage': 'Create and edit branches',
  'staff.manage': 'Invite staff and assign roles',
  'programs.manage': 'Create and edit loyalty programs',
  'rewards.manage': 'Create and edit rewards',
  'members.read': 'View members of this merchant',
  'stamps.issue': 'Issue stamps to a customer',
  'redemptions.process': 'Confirm reward redemptions',
  'analytics.read': 'View analytics',
  'billing.read': 'View invoices and subscription status',
};

const ROLES: Array<{ key: string; name: string; scope: RoleScope; permissions: string[] }> = [
  {
    key: 'platform_admin',
    name: 'Platform admin',
    scope: RoleScope.PLATFORM,
    permissions: ['merchants.manage', 'plans.manage', 'audit.read'],
  },
  {
    key: 'merchant_owner',
    name: 'Owner',
    scope: RoleScope.MERCHANT,
    permissions: [
      'merchant.settings.manage',
      'branches.manage',
      'staff.manage',
      'programs.manage',
      'rewards.manage',
      'members.read',
      'stamps.issue',
      'redemptions.process',
      'analytics.read',
      'billing.read',
    ],
  },
  {
    key: 'merchant_manager',
    name: 'Manager',
    scope: RoleScope.MERCHANT,
    permissions: [
      'programs.manage',
      'rewards.manage',
      'members.read',
      'stamps.issue',
      'redemptions.process',
      'analytics.read',
    ],
  },
  {
    key: 'branch_manager',
    name: 'Branch manager',
    scope: RoleScope.MERCHANT,
    permissions: ['staff.manage', 'members.read', 'stamps.issue', 'redemptions.process'],
  },
  {
    key: 'staff',
    name: 'Staff',
    scope: RoleScope.MERCHANT,
    permissions: ['stamps.issue', 'redemptions.process'],
  },
];

async function main() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  }

  for (const role of ROLES) {
    // merchantId is NULL for built-in roles. MySQL treats NULLs as distinct in unique indexes, so
    // look the role up explicitly instead of relying on upsert with the compound key.
    const existing = await prisma.role.findFirst({ where: { key: role.key, merchantId: null } });
    const saved =
      existing ??
      (await prisma.role.create({ data: { key: role.key, name: role.name, scope: role.scope } }));

    const perms = await prisma.permission.findMany({ where: { key: { in: role.permissions } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: saved.id, permissionId: p.id })),
    });
  }

  console.log(`Seeded ${Object.keys(PERMISSIONS).length} permissions and ${ROLES.length} roles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
