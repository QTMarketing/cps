import { cookies } from "next/headers";
import MakePaymentForm from "@/app/it-office/checks/components/MakePaymentForm";
import RecentChecksTable from "@/app/it-office/checks/components/RecentChecksTable";

export default async function WriteChecksPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  // Render MakePayment and Recent Checks in a responsive 2-column grid
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MakePaymentForm />
      <RecentChecksTable />
    </div>
  );
}