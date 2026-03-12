import { SearchX, User, UserCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

function UsersOverviewCards({
	t,
	totalItems,
	visibleUsersOnPage,
	privilegedUsersOnPage,
	searchActive,
	debouncedQuery,
}) {
	return (
		<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('users.breadcrumbs.users')}</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{totalItems}</p>
						<p className="text-xs text-muted-foreground">{t('common.total', 'Total records')}</p>
					</div>
					<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
						<Users className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('common.visible', 'Visible')}</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{visibleUsersOnPage}</p>
						<p className="text-xs text-muted-foreground">{t('common.current_page', 'Current page')}</p>
					</div>
					<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
						<User className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('users.columns.role')}</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{privilegedUsersOnPage}</p>
						<p className="text-xs text-muted-foreground">{t('roles.badges.tenant_root')}</p>
					</div>
					<span className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-500">
						<UserCheck className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('common.search', 'Search')}</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							{searchActive ? debouncedQuery : t('common.none', 'No filter')}
						</p>
						<p className="text-xs text-muted-foreground">
							{searchActive ? t('common.filtered', 'Filtered results') : t('common.all_items', 'Showing all items')}
						</p>
					</div>
					<span
						className={cn(
							'rounded-xl border p-2',
							searchActive
								? 'border-primary/25 bg-primary/10 text-primary'
								: 'border-border/70 bg-background/70 text-muted-foreground'
						)}
					>
						<SearchX className="h-4 w-4" />
					</span>
				</div>
			</div>
		</div>
	);
}

export default UsersOverviewCards;
