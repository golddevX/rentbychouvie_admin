import { redirect } from 'next/navigation';

export default async function LegacyBookingPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ deposit?: string }>;
}) {
  const { bookingId } = await params;
  const { deposit } = await searchParams;
  const query = new URLSearchParams({ booking: bookingId });
  if (deposit) query.set('deposit', deposit);
  redirect(`/admin/payments?${query.toString()}`);
}
