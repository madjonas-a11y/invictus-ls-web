import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, Music, Image as ImageIcon, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

const FunZone = () => {
  const { t, lang } = useTranslation();

  const { data: media, isLoading } = useQuery({
    queryKey: ["media_gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_gallery" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Smart URL converter for YouTube Shorts and Standard Videos
  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/shorts/")) {
      return url.replace("shorts/", "embed/");
    }
    if (url.includes("watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Cleaned Header - Matched to Dashboard/Fantasy style */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display gold-text uppercase tracking-widest">
            {lang === "pt" ? "Zona de Lazer" : "Fun Zone"}
          </h1>
          <div className="h-1 w-12 gold-gradient mx-auto mt-4 rounded-full opacity-50" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : !media || media.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-sm font-display tracking-widest uppercase">
              {lang === "pt" ? "Ainda não há conteúdo" : "No content yet"}
            </p>
          </div>
        ) : (
          /* Masonry Grid */
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {media?.map((item: any) => (
              <div 
                key={item.id} 
                className="break-inside-avoid card-shine rounded-xl overflow-hidden border border-border/40 bg-secondary/10 group hover:border-primary/40 transition-all duration-500"
              >
                {item.media_type === "video" && (
                  <div className="aspect-[9/16] bg-black relative">
                    <iframe
                      src={getEmbedUrl(item.url)}
                      className="w-full h-full"
                      allowFullScreen
                      loading="lazy"
                      title={item.title}
                    />
                  </div>
                )}

                {item.media_type === "image" && (
                  <div className="relative overflow-hidden">
                    <img 
                      src={item.url} 
                      alt={item.title} 
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                  </div>
                )}

                <div className="p-4 bg-background/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {item.media_type === "video" && <Play size={10} className="text-primary fill-primary" />}
                    {item.media_type === "audio" && <Music size={10} className="text-primary" />}
                    {item.media_type === "image" && <ImageIcon size={10} className="text-primary" />}
                    <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="font-display text-sm text-foreground tracking-wide leading-tight">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FunZone;