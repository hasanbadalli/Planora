import { LoaderCircle } from "lucide-react";

export default function ProjectWorkspaceLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      Loading project workspace...
    </div>
  );
}
