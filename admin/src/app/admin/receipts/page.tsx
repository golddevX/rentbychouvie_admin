import { CrudPage } from '@/components/admin/crud';
import { receiptCrudConfig } from '@/lib/admin/crud-configs';

export default function ReceiptsPage() {
  return <CrudPage config={receiptCrudConfig} />;
}
