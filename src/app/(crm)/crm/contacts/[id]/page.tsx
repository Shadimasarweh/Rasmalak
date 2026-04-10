'use client';

import { use } from 'react';
import { ContactDetail } from '@/components/crm/contacts/ContactDetail';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ContactDetail contactId={id} />;
}
