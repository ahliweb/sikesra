import { AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import SidebarMenuGroupRow from '@/components/dashboard/sidebar-menu/SidebarMenuGroupRow';

function SidebarMenuGroupsTab({
  t,
  hasChanges,
  activeTab,
  handleSaveGroupOrder,
  isSaving,
  canManage,
  groups,
  handleOpenNewGroup,
  handleGroupReorder,
  handleEditGroup,
}) {
  return (
    <TabsContent value="groups" className="space-y-4">
      <div className="flex min-h-[500px] flex-col rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">{t('sidebar_manager.tabs.groups')}</h3>
            <p className="text-xs text-muted-foreground">{t('sidebar_manager.subtitle')}</p>
          </div>

          {hasChanges && activeTab === 'groups' && (
            <Button onClick={handleSaveGroupOrder} disabled={isSaving} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? t('sidebar_manager.saving') : t('sidebar_manager.save_group_order')}
            </Button>
          )}

          {canManage && (
            <Button
              onClick={handleOpenNewGroup}
              size="sm"
              variant="outline"
              className="border-green-600/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('sidebar_manager.add_group')}
            </Button>
          )}
        </div>

        <div className="flex-1 p-6">
          <Reorder.Group axis="y" values={groups} onReorder={handleGroupReorder} className="space-y-2">
            <AnimatePresence>
              {groups.map((group) => (
                <SidebarMenuGroupRow
                  key={group.id}
                  group={group}
                  canManage={canManage}
                  onEdit={handleEditGroup}
                  t={t}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      </div>
    </TabsContent>
  );
}

export default SidebarMenuGroupsTab;
