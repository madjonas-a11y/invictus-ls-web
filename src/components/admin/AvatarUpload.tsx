import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, X } from "lucide-react";

interface AvatarUploadProps {
  currentUrl: string;
  onUploaded: (url: string) => void;
  bucket?: string;
  fallbackIcon?: React.ReactNode;
}

const AvatarUpload = ({ currentUrl, onUploaded, bucket = "avatars", fallbackIcon }: AvatarUploadProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    setPreview(publicUrl);
    onUploaded(publicUrl);
    setUploading(false);
    toast({ title: "Photo uploaded!" });
  };

  const handleClear = () => {
    setPreview("");
    onUploaded("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-secondary flex items-center justify-center shrink-0">
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          fallbackIcon || <User className="text-muted-foreground" size={24} />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? "Uploading…" : "Upload Photo"}
        </button>
        {preview && (
          <button type="button" onClick={handleClear} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive">
            <X size={10} /> Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;
