import { useState, useRef } from "react";
import { Camera, Image, Loader2, X, Check, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PantryItem {
  name: string;
  category: string;
  quantity: string;
}

interface PhotoScannerProps {
  mode: "pantry" | "fridge-chef";
  onItemsDetected: (items: string[] | PantryItem[]) => void;
}

export function PhotoScanner({ mode, onItemsDetected }: PhotoScannerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[] | PantryItem[] | null>(null);
  const [summary, setSummary] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const processImage = async (base64Data: string) => {
    setScanning(true);
    setDialogOpen(true);
    setPreview(base64Data);
    setDetectedItems(null);

    try {
      const { data, error } = await supabase.functions.invoke("scan-pantry-photo", {
        body: { image: base64Data, mode: mode === "pantry" ? "pantry" : "fridge-chef" },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (mode === "fridge-chef") {
        setDetectedItems(data.items || []);
      } else {
        setDetectedItems(data.items || []);
      }
      setSummary(data.summary || "");
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
      setDialogOpen(false);
    } finally {
      setScanning(false);
    }
  };

  const takePhoto = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          width: 1024,
          height: 1024,
        });
        if (photo.base64String) {
          const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
          await processImage(`data:${mimeType};base64,${photo.base64String}`);
        }
      } else {
        fileRef.current?.click();
      }
    } catch (err: any) {
      if (!err.message?.includes("User cancelled")) {
        toast({ title: "Camera error", description: err.message, variant: "destructive" });
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Photos,
          width: 1024,
          height: 1024,
        });
        if (photo.base64String) {
          const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
          await processImage(`data:${mimeType};base64,${photo.base64String}`);
        }
      } else {
        fileRef.current?.click();
      }
    } catch (err: any) {
      if (!err.message?.includes("User cancelled")) {
        toast({ title: "Gallery error", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      processImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const confirmItems = () => {
    if (detectedItems) {
      onItemsDetected(detectedItems);
      toast({
        title: "Items added!",
        description: `${Array.isArray(detectedItems) ? detectedItems.length : 0} items detected from your photo.`,
      });
    }
    setDialogOpen(false);
    setPreview(null);
    setDetectedItems(null);
    setSummary("");
  };

  const isNative = Capacitor.isNativePlatform();

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={takePhoto}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Camera className="w-4 h-4" />
          {isNative ? "Take Photo" : "Scan Photo"}
        </Button>
        {isNative && (
          <Button
            variant="outline"
            size="sm"
            onClick={pickFromGallery}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Image className="w-4 h-4" />
            Gallery
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              {scanning ? "Scanning Your Food..." : "Items Found"}
            </DialogTitle>
          </DialogHeader>

          {/* Photo preview */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Scanned food" className="w-full h-48 object-cover" />
            </div>
          )}

          {/* Loading state */}
          {scanning && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">AI is identifying your food items...</p>
            </div>
          )}

          {/* Results */}
          {!scanning && detectedItems && (
            <div className="space-y-4">
              {summary && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{summary}</p>
              )}

              <div className="space-y-1.5">
                <h4 className="font-semibold text-foreground text-sm">
                  Detected Items ({detectedItems.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detectedItems.map((item, i) => {
                    const name = typeof item === "string" ? item : item.name;
                    return (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full"
                      >
                        <Check className="w-3 h-3" />
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDialogOpen(false);
                    setDetectedItems(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-honey text-primary-foreground hover:opacity-90"
                  onClick={confirmItems}
                >
                  Add All Items
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
