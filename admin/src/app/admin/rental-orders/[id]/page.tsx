import { redirect } from 'next/navigation';

export default function RentalOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  redirect(`/admin/bookings/${id}`);
}
