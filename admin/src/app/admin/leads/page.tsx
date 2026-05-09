import { Suspense } from 'react';
import { LeadManagementScreen } from '@/components/admin/lead-management-screen';

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadManagementScreen />
    </Suspense>
  );
}
