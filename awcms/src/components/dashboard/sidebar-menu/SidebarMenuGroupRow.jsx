import { Reorder } from 'framer-motion';
import { Edit2, FolderOpen, GripVertical, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SidebarMenuGroupRow({
  group,
  canManage,
  onEdit,
  t,
}) {
  const canEditGroup = canManage && !group.isExtension && !group.isPlugin;

  return (
    <Reorder.Item
      key={group.id}
      value={group}
      drag={canEditGroup ? 'y' : false}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm ${group.isExtension ? 'border-dashed border-indigo-200 bg-muted/30 dark:border-indigo-900/30' : 'border-border'} ${canEditGroup ? 'cursor-grab active:cursor-grabbing hover:border-primary/50' : ''}`}
    >
      {canEditGroup ? (
        <div className="p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
      ) : (
        <div className="flex w-7 justify-center p-1">
          {group.isExtension && <Puzzle className="h-4 w-4 text-indigo-400" />}
        </div>
      )}

      <div className={`rounded-md p-2 ${group.isExtension ? 'bg-indigo-100/50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-muted text-muted-foreground'}`}>
        <FolderOpen className="h-5 w-5" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium ${group.isExtension ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
            {group.label}
          </h4>
          {group.isExtension && (
            <span className="rounded-full border border-indigo-200 bg-indigo-100 px-1.5 text-[10px] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
              {t('sidebar_manager.module')}
            </span>
          )}
          {group.isPlugin && (
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-1.5 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              {t('sidebar_manager.core')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('sidebar_manager.order')}: {group.order}</p>
      </div>

      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          disabled={group.isExtension || group.isPlugin}
          onClick={() => onEdit(group)}
          className="text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"
          title={group.isExtension || group.isPlugin ? t('sidebar_manager.managed_by_ext') : t('sidebar_manager.edit_group')}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
    </Reorder.Item>
  );
}

export default SidebarMenuGroupRow;
