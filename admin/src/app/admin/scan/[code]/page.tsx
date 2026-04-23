import { ScanWorkbench } from '@/components/admin/qr-operations';

export default function ScanCodePage({ params }: { params: { code: string } }) {
  return <ScanWorkbench initialCode={decodeURIComponent(params.code)} />;
}
