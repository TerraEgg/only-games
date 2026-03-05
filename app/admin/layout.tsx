import AdminSidebar from "@/components/AdminSidebar";

export const metadata = { title: "Admin — OnlyGames" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
