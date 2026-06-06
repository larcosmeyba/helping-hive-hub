import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, BookmarkX } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getSavedFamilyResources, unsaveFamilyResource, type CommunityResource } from "@/lib/familyResources";

export default function FamilySavedResourcesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ id: string; resource_id: string; resource: CommunityResource | null }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getSavedFamilyResources();
      setItems((r.saved ?? []) as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load saved resources");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (resource_id: string) => {
    try {
      await unsaveFamilyResource(resource_id);
      setItems((prev) => prev.filter((it) => it.resource_id !== resource_id));
      toast.success("Removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-32 pt-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate("/dashboard/family-assistance")}
          className="w-9 h-9 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#1a1a1a]" />
        </button>
      </div>

      <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">Saved Resources</h1>
      <p className="text-[12.5px] text-[#6b6b6b] mt-1 mb-4">
        The resources you've saved for your family.
      </p>

      {loading ? (
        <p className="text-center text-[#6b6b6b] py-10">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 text-center">
          <p className="font-semibold text-[#1a1a1a]">No saved resources yet.</p>
          <button
            onClick={() => navigate("/dashboard/family-assistance")}
            className="mt-3 px-4 py-2 rounded-xl bg-[#E63B6B] text-white text-[13px] font-semibold"
          >
            Find Resources
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) =>
            it.resource ? (
              <div key={it.id} className="bg-white border border-[#EAEAEA] rounded-2xl p-3 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/dashboard/family-assistance/resource/${it.resource_id}`)}
                  className="flex-1 text-left"
                >
                  <p className="font-bold text-[14px] text-[#1a1a1a]">{it.resource.name}</p>
                  <p className="text-[11.5px] text-[#6b6b6b] capitalize">
                    {it.resource.category.replace(/_/g, " ")}
                    {it.resource.zip_code ? ` · ${it.resource.zip_code}` : ""}
                  </p>
                </button>
                <button
                  onClick={() => remove(it.resource_id)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b6b6b] hover:text-[#B5371A]"
                  aria-label="Remove"
                >
                  <BookmarkX className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-[#999]" />
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
