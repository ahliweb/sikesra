import { Files, Layers, Tags, UploadCloud } from 'lucide-react';

function FilesOverviewCards({ showTrash, selectedCategoryName, categoriesCount, uploading }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Scope</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{showTrash ? 'Trash View' : 'Library View'}</p>
            <p className="text-xs text-muted-foreground">{showTrash ? 'Restore managed assets' : 'Upload and organize media'}</p>
          </div>
          <span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
            <Files className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Category</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedCategoryName || 'All Files'}</p>
            <p className="text-xs text-muted-foreground">Current filter</p>
          </div>
          <span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
            <Tags className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Categories</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{categoriesCount}</p>
            <p className="text-xs text-muted-foreground">Available groups</p>
          </div>
          <span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
            <Layers className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Upload</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{uploading ? 'In Progress' : 'Ready'}</p>
            <p className="text-xs text-muted-foreground">{uploading ? 'Processing files' : 'Dropzone available'}</p>
          </div>
          <span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
            <UploadCloud className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default FilesOverviewCards;
