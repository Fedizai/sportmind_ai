
"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, Plus, Search, FileText, Video as VideoIcon, Link as LinkIcon, ExternalLink, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import type { TranslationKey } from "@/lib/i18n";
import { useResources, type Resource, type ResourceCategory } from "@/hooks/use-resources";

const resourceFormSchema = z.object({
  title: z.string().min(1, "Required"),
  category: z.enum(["video", "document", "link"]),
  sport: z.enum(["football", "tennis", "gym", "all"]),
  url: z.string().url("Invalid URL"),
  description: z.string().optional(),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const CATEGORY_ICON: Record<ResourceCategory, LucideIcon> = {
  video: VideoIcon,
  document: FileText,
  link: LinkIcon,
};

const CATEGORY_FILTERS: (ResourceCategory | "all")[] = ["all", "video", "document", "link"];

export default function ResourcesPage() {
  const { t } = useTranslation();
  const { resources, addResource, deleteResource } = useResources();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: { title: "", category: "link", sport: "all", url: "", description: "" },
  });

  const categoryLabel = (category: ResourceCategory) => {
    switch (category) {
      case "video":
        return t("video");
      case "document":
        return t("categoryDocument");
      case "link":
        return t("categoryLink");
    }
  };

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [resources, categoryFilter, search]);

  const onSubmit = async (values: ResourceFormValues) => {
    await addResource({ ...values, description: values.description || undefined });
    form.reset({ title: "", category: "link", sport: "all", url: "", description: "" });
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteResource(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <Book className="h-8 w-8 text-primary" />
            {t("resources")}
          </h1>
          <p className="text-muted-foreground">{t("drillPlanLibraryDescription")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t("addNewResource")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("drillPlanLibrary")}</CardTitle>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchResources")}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 pt-4 flex-wrap">
            {CATEGORY_FILTERS.map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? "secondary" : "outline"}
                onClick={() => setCategoryFilter(category)}
              >
                {category === "all" ? t("all") : categoryLabel(category)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-64 flex items-center justify-center">
              <div className="text-muted-foreground">
                <p className="font-semibold">{t("libraryEmpty")}</p>
                <p className="text-sm">{t("libraryEmptyDescription")}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  categoryLabel={categoryLabel}
                  t={t}
                  onDelete={() => setDeleteTarget(resource)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addNewResource")}</DialogTitle>
            <DialogDescription>{t("addResourceDialogDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("resourceCategory")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">{t("video")}</SelectItem>
                          <SelectItem value="document">{t("categoryDocument")}</SelectItem>
                          <SelectItem value="link">{t("categoryLink")}</SelectItem>
                        </SelectContent>
                      </Select>
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
              </div>

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
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
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

function ResourceCard({
  resource,
  categoryLabel,
  onDelete,
  t,
}: {
  resource: Resource;
  categoryLabel: (category: ResourceCategory) => string;
  onDelete: () => void;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
}) {
  const Icon = CATEGORY_ICON[resource.category];
  return (
    <div className="rounded-lg border bg-card/50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold leading-tight line-clamp-2">{resource.title}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-1 -mr-1" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
      {resource.description && <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{categoryLabel(resource.category)}</Badge>
        {resource.sport !== "all" && <Badge variant="secondary">{t(resource.sport)}</Badge>}
      </div>
      <Button variant="outline" size="sm" className="mt-auto" asChild>
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" /> {t("open")}
        </a>
      </Button>
    </div>
  );
}
