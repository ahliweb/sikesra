import { AnimatePresence, Reorder } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import MinCharSearchInput from '@/components/common/MinCharSearchInput';
import { TabsContent } from '@/components/ui/tabs';
import SidebarMenuItemRow from '@/components/dashboard/sidebar-menu/SidebarMenuItemRow';

function SidebarMenuItemsTab({
  t,
  query,
  setQuery,
  clearSearch,
  loading,
  searchLoading,
  isSearchValid,
  searchMessage,
  minLength,
  filteredItems,
  items,
  handleReorder,
  canManage,
  handleEdit,
  handleToggleVisibility,
}) {
  return (
    <TabsContent value="items" className="space-y-4">
      <div className="flex min-h-[500px] flex-col rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
          <div className="w-full max-w-sm">
            <MinCharSearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={clearSearch}
              loading={loading || searchLoading}
              isValid={isSearchValid}
              message={searchMessage}
              minLength={minLength}
              placeholder={t('sidebar_manager.search_placeholder')}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {t('sidebar_manager.items_found', { count: filteredItems.length })}
          </div>
        </div>

        <div className="flex-1 p-6">
          {loading && items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <RefreshCw className="mb-2 h-8 w-8 animate-spin" />
              <p>{t('sidebar_manager.loading_config')}</p>
            </div>
          ) : (
            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <SidebarMenuItemRow
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onEdit={handleEdit}
                    onToggleVisibility={handleToggleVisibility}
                    t={t}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      </div>
    </TabsContent>
  );
}

export default SidebarMenuItemsTab;
