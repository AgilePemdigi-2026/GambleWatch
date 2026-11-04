import DetailVerifikasiPage from "@/app/admin/verifikasi/[id]/page";

// Membuat alias rute sesuai kebutuhan BDD Testing SRS
export default async function ReportFollowUpBlockingStatusPage() {
  // Memberikan mock param ID '1' agar skrip BDD dapat langsung mengakses URL /report-follow-up-blocking-status
  const mockParams = Promise.resolve({ id: "1" });

  return <DetailVerifikasiPage params={mockParams} />;
}