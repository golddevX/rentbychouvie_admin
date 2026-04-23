import { CrudPage } from '@/components/admin/crud';
import { previewCrudConfig } from '@/lib/admin/crud-configs';

export default function PreviewQueuePage() {
  return <CrudPage config={previewCrudConfig} />;
}
