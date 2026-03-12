import { ArrowLeft, Loader2, Monitor, Save, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ThemeEditorTopBar({
  navigate,
  t,
  name,
  previewMode,
  setPreviewMode,
  handleSave,
  saving,
  canEdit,
}) {
  return (
    <div className="z-10 flex shrink-0 items-center justify-between border-b border-border/70 bg-card/90 px-6 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cmspanel/themes')} className="rounded-xl hover:bg-accent/70">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-tight text-foreground">{t('theme_editor.title')}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-primary">{name}</span>
            <span>•</span>
            <span>{t('theme_editor.editing_mode')}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden rounded-xl border border-border/60 bg-background/70 p-1 md:flex">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 rounded-lg px-3', previewMode === 'desktop' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="mr-1.5 h-3.5 w-3.5" /> {t('theme_editor.desktop_view')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 rounded-lg px-3', previewMode === 'mobile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="mr-1.5 h-3.5 w-3.5" /> {t('theme_editor.mobile_view')}
          </Button>
        </div>
        <div className="mx-1 h-6 w-px bg-border"></div>
        <Button onClick={handleSave} disabled={saving || !canEdit} className="min-w-[140px] rounded-xl bg-primary text-primary-foreground shadow-sm hover:opacity-95">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? t('theme_editor.saving') : t('theme_editor.save_changes')}
        </Button>
      </div>
    </div>
  );
}

export default ThemeEditorTopBar;
