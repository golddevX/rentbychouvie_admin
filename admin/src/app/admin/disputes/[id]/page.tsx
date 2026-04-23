import { DisputeCaseWorkspace } from '@/components/admin/audit/DisputeCaseWorkspace';

export default function DisputeDetailPage({ params }: { params: { id: string } }) {
  return <DisputeCaseWorkspace initialId={params.id} />;
}
