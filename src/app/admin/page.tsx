import { AdminPanel } from "@/components/recipes/admin-panel";
import { getContentMode } from "@/lib/recipes";

export const metadata = {
  title: "Kitchen desk",
};

export default function AdminPage() {
  const contentMode = getContentMode();
  return (
    <div className="mx-auto max-w-4xl px-5 py-28 md:px-8 md:py-32">
      <AdminPanel contentMode={contentMode} />
    </div>
  );
}
