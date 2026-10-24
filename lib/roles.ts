/**
 * Role catalogue and route policy. Pure constants and helpers with no
 * dependencies, so both server and client components can import this module.
 */

export const SESSION_COOKIE = "resto_admin_session";

/** Session lifetime in seconds (8 hours). */
export const SESSION_MAX_AGE = 60 * 60 * 8;

export const ROLES = [
  "MASTER",
  "ADMIN_KITCHEN",
  "CHEF",
  "PURCHASING",
  "ACCOUNTANT",
  "CASHIER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  MASTER: "Master",
  ADMIN_KITCHEN: "Admin Kitchen",
  CHEF: "Chef",
  PURCHASING: "Purchasing",
  ACCOUNTANT: "Accountant",
  CASHIER: "Cashier",
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

export function normalizeRole(value: unknown): Role {
  return isRole(value) ? value : "CASHIER";
}

/** Roles allowed to read and modify the product / menu master data. */
export const PRODUCT_ROLES: Role[] = ["MASTER", "CASHIER", "ADMIN_KITCHEN"];

export function isProductManager(role: Role): boolean {
  return PRODUCT_ROLES.includes(role);
}

/**
 * Paths that require specific roles. Anything under `/admin` that is not
 * listed here is available to every authenticated admin.
 */
const ROUTE_ACCESS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin/users", roles: ["MASTER"] },
  { prefix: "/admin/products", roles: PRODUCT_ROLES },
];

export function canAccess(role: Role, pathname: string): boolean {
  const rule = ROUTE_ACCESS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)
  );
  return rule ? rule.roles.includes(role) : true;
}

export type AdminSession = {
  id: string;
  username: string;
  role: Role;
};
