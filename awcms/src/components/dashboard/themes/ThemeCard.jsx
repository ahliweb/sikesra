import {
  Copy,
  Download,
  Edit,
  MoreVertical,
  Power,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MiniThemePreview from '@/components/dashboard/themes/MiniThemePreview';

function ThemeCard({
  theme,
  isPlatformAdmin,
  canUpdate,
  onEdit,
  onActivate,
  onExport,
  onDuplicate,
  onDeleteRequest,
}) {
  return (
    <div className={`group flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 ${theme.is_active ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border hover:border-primary/50 hover:shadow-lg'}`}>
      <MiniThemePreview config={theme.config} isActive={theme.is_active} />

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="truncate pr-2 font-semibold text-foreground" title={theme.name}>{theme.name}</h3>
            {isPlatformAdmin && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {theme.tenant?.name || '(Unknown Tenant)'}
              </span>
            )}
            <p className="mt-1 line-clamp-2 min-h-[2.5em] text-xs text-muted-foreground">
              {theme.description || 'No description provided.'}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => onExport(theme)}>
                <Download className="mr-2 h-4 w-4" /> Export JSON
              </DropdownMenuItem>

              {canUpdate && (
                <DropdownMenuItem onClick={() => onDuplicate(theme)}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {canUpdate && (
                <DropdownMenuItem
                  onClick={() => onDeleteRequest(theme.id)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  disabled={theme.is_active}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(theme.id)}
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Customize
            </Button>
          )}

          {!theme.is_active && canUpdate && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onActivate(theme.id)}
            >
              <Power className="mr-1.5 h-3.5 w-3.5" /> Activate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThemeCard;
