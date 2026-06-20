import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { scanInventoryPhoto } from "@/lib/hiveAi";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { trackEvent } from "@/lib/analytics";

export default function HiveAiScanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const scanEnabled = useFeatureFlag("hive-ai-pantry-scan", true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [tab, setTab] = useState<"camera" | "upload">("camera");
  const [scanning, setScanning] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setPreview(data);
      setBase64(data.split(",")[1] ?? "");
    };
    reader.readAsDataURL(f);
  };

  const handleScan = async () => {
    if (!base64) {
      toast({ title: "Add a photo first", description: "Take or upload a photo of your food.", variant: "destructive" });
      return;
    }
    setScanning(true);
    try {
      const res = await scanInventoryPhoto(base64, "fridge");
      void trackEvent("pantry_photo_scanned", {
        scan_type: "fridge",
        detected: Array.isArray(res?.detected_items) ? res.detected_items.length : 0,
      });
      navigate("/dashboard/hive-ai/scan/review", { state: { detected: res.detected_items, photo_id: res.photo_id } });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-1 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-[14px] text-[#1a1a1a]">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h1 className="text-center text-[18px] font-extrabold text-[#1a1a1a] mb-4">Scan My Food</h1>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => { setTab("camera"); fileRef.current?.click(); }}
          className={`py-3 rounded-xl text-[14px] font-semibold ${tab === "camera" ? "bg-[#5B3FBF] text-white" : "bg-white border border-[#E5E5E5] text-[#1a1a1a]"}`}
        >
          Camera
        </button>
        <button
          onClick={() => { setTab("upload"); fileRef.current?.click(); }}
          className={`py-3 rounded-xl text-[14px] font-semibold ${tab === "upload" ? "bg-[#5B3FBF] text-white" : "bg-white border border-[#E5E5E5] text-[#1a1a1a]"}`}
        >
          Upload Photo
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={tab === "camera" ? "environment" : undefined}
        onChange={onPick}
        className="hidden"
      />

      <div className="relative rounded-2xl overflow-hidden bg-[#F0F0F0] aspect-[3/4] mb-3 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Food preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-6">
            <Camera className="w-12 h-12 text-[#5B3FBF] mx-auto mb-2" />
            <p className="text-[13px] text-[#6b6b6b]">Tap Camera or Upload to add a photo</p>
          </div>
        )}
      </div>

      <p className="text-center text-[12px] text-[#6b6b6b] mb-4">
        Take a clear photo of your pantry, fridge, freezer, or receipt.
      </p>

      <button
        disabled={scanning}
        onClick={handleScan}
        className="w-full bg-[#5B3FBF] text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Scan Photo
      </button>
    </div>
  );
}
