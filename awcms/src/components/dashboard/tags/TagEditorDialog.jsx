import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function TagEditorDialog({
  dialogOpen,
  setDialogOpen,
  editingTag,
  formData,
  setFormData,
  handleSave,
  saving,
}) {
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingTag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
          <DialogDescription>
            {editingTag
              ? 'Update tag details. Changes reflect across all modules immediately.'
              : 'Create a new tag to categorize content.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(event) => {
                setFormData((prev) => ({
                  ...prev,
                  name: event.target.value,
                  slug: !editingTag ? event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev.slug,
                }));
              }}
              className="col-span-3"
              placeholder="e.g. Technology"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slug" className="text-right">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
              className="col-span-3"
              placeholder="e.g. technology"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">Color</Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(event) => setFormData((prev) => ({ ...prev, color: event.target.value }))}
                className="h-10 w-12 cursor-pointer border-input bg-transparent p-1"
              />
              <Input
                value={formData.color}
                onChange={(event) => setFormData((prev) => ({ ...prev, color: event.target.value }))}
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="is_active" className="text-right">Status</Label>
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(event) => setFormData((prev) => ({ ...prev, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
              />
              <Label htmlFor="is_active" className="font-normal text-muted-foreground">
                Active (Visible in selectors)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TagEditorDialog;
