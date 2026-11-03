export interface CustomerProfile {
  id: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
}

interface CustomerWithIdentities {
  id: string;
  displayName: string;
  identities: Array<{ type: 'EMAIL' | 'PHONE'; value: string; verifiedAt: Date | null }>;
}

export function toCustomerProfile(customer: CustomerWithIdentities): CustomerProfile {
  const email = customer.identities.find((i) => i.type === 'EMAIL');
  const phone = customer.identities.find((i) => i.type === 'PHONE');
  return {
    id: customer.id,
    displayName: customer.displayName,
    email: email?.value ?? null,
    emailVerified: Boolean(email?.verifiedAt),
    phone: phone?.value ?? null,
    phoneVerified: Boolean(phone?.verifiedAt),
  };
}
