
"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Video, Upload, Search, MessageCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTranslation } from "@/hooks/use-translation";
import { useResources, useResourceComments, type Resource } from "@/hooks/use-resources";
import { cn } from "@/lib/utils";

const videoFormSchema = z.object({
  title: z.string().min(1, "Required"),
  sport: z.enum(["football", "tennis", "gym", "all"]),
  url: z.string().url("Invalid URL"),
  description: z.string().optional(),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

function getYouTubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?&]+)/, /youtube\.com\/embed\/([^?&]+)/];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function VideoEmbed({ url }: { url: string }) {
  const youtubeId = getYouTubeId(url);
  const vimeoId = getVimeoId(url);
  if (youtubeId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (vimeoId) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}`}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <video src={url} controls className="w-full h-full bg-black" />;
}

export default function VideoReviewPage() {
  const { t } = useTranslation();
  const { resources: videos, addResource, deleteResource } = useResources("video");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [commentText, setCommentText] = useState("");
  const [timestampLabel, setTimestampLabel] = useState("");

  const { comments, addComment, deleteComment } = useResourceComments(selectedId);

  useEffect(() => {
    if (!selectedId && videos.length > 0) {
      setSelectedId(videos[0].id);
    }
  }, [videos, selectedId]);

  const selectedVideo = videos.find((v) => v.id === selectedId) || null;

  const filteredVideos = useMemo(() => {
    if (!librarySearch) return videos;
    return videos.filter((v) => v.title.toLowerCase().includes(librarySearch.toLowerCase()));
  }, [videos, librarySearch]);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: { title: "", sport: "all", url: "", description: "" },
  });

  const onSubmitVideo = async (values: VideoFormValues) => {
    await addResource({
      title: values.title,
      category: "video",
      sport: values.sport,
      url: values.url,
      description: values.description || undefined,
    });
    form.reset({ title: "", sport: "all", url: "", description: "" });
    setUploadOpen(false);
  };

  const handleAddComment = async () => {
    if (!selectedId || !commentText.trim()) return;
    await addComment(commentText.trim(), timestampLabel.trim() || "0:00");
    setCommentText("");
    setTimestampLabel("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (selectedId === deleteTarget.id) setSelectedId(null);
    await deleteResource(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            {t("videoReview")}
          </h1>
          <p className="text-muted-foreground">{t("videoReviewDescription")}</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> {t("uploadNewVideo")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedVideo ? selectedVideo.title : t("videoPlayer")}</CardTitle>
              {selectedVideo?.description && <CardDescription>{selectedVideo.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg relative overflow-hidden flex items-center justify-center border-2 border-dashed">
                {selectedVideo ? (
                  <VideoEmbed url={selectedVideo.url} />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto" />
                    <p className="mt-2 text-sm">{t("selectVideoToAnalyze")}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full space-y-2">
                <h3 className="font-semibold text-lg">{t("timelineComments")}</h3>
                {comments.length === 0 ? (
                  <div className="flex items-center justify-center text-muted-foreground text-sm h-24 border-2 border-dashed rounded-lg">
                    <p>{selectedVideo ? t("commentsAppearHere") : t("noVideoResources")}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-40 rounded-lg border p-3">
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="shrink-0 mt-0.5 font-mono">
                            {comment.timestampLabel}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="break-words">{comment.text}</p>
                            <p className="text-xs text-muted-foreground">{comment.createdByName}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            title={t("deleteComment")}
                            onClick={() => deleteComment(comment.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder={t("timestampPlaceholder")}
                    className="w-28 shrink-0"
                    value={timestampLabel}
                    onChange={(e) => setTimestampLabel(e.target.value)}
                    disabled={!selectedVideo}
                  />
                  <Input
                    placeholder={t("addCommentAtTime")}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    disabled={!selectedVideo}
                  />
                  <Button onClick={handleAddComment} disabled={!selectedVideo || !commentText.trim()}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t("comment")}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t("videoLibrary")}</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchLibrary")}
                  className="pl-8"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[400px]">
              {filteredVideos.length === 0 ? (
                <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground p-4 text-center">
                  <p className="text-sm">{t("videosAppearHere")}</p>
                </div>
              ) : (
                filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedId(video.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      selectedId === video.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                    )}
                  >
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{video.title}</p>
                      {video.sport !== "all" && (
                        <p className="text-xs text-muted-foreground">{t(video.sport)}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(video);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("uploadNewVideo")}</DialogTitle>
            <DialogDescription>{t("addResourceDialogDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitVideo)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("title")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resourceUrl")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("resourceUrlPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sport")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">{t("all")}</SelectItem>
                        <SelectItem value="football">{t("football")}</SelectItem>
                        <SelectItem value="tennis">{t("tennis")}</SelectItem>
                        <SelectItem value="gym">{t("gym")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("description")} <span className="text-muted-foreground">({t("optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {t("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t("confirmDeleteItem", { title: deleteTarget.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
