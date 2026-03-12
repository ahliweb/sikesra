import { Filter, Languages, ListChecks, Sparkles, Trash2 } from 'lucide-react';

function BlogsOverviewCards({
	t,
	activeSectionLabel,
	selectedLanguage,
	selectedLanguageLabel,
	activeView,
}) {
	return (
		<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('common.section', 'Section')}</p>
						<p className="mt-1 text-sm font-semibold text-foreground">{activeSectionLabel}</p>
						<p className="text-xs text-muted-foreground">{t('common.manage', 'Manage content')}</p>
					</div>
					<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
						<Filter className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('common.language') || 'Language'}</p>
						<p className="mt-1 text-sm font-semibold text-foreground">{selectedLanguageLabel}</p>
						<p className="text-xs text-muted-foreground">{selectedLanguage.toUpperCase()}</p>
					</div>
					<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
						<Languages className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('blogs.workflow')}</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							{activeView === 'queue' ? t('common.review_queue', 'Review Queue') : t('common.standard', 'Standard View')}
						</p>
						<p className="text-xs text-muted-foreground">{activeView === 'queue' ? t('common.filtered', 'Filtered results') : t('common.all_items', 'Showing all items')}</p>
					</div>
					<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
						<ListChecks className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('blogs.type')}</p>
						<p className="mt-1 text-sm font-semibold text-foreground">{t('blogs.visual_builder')}</p>
						<p className="text-xs text-muted-foreground">{t('common.create', 'Create')} + {t('common.edit', 'Edit')}</p>
					</div>
					<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
						{activeView === 'trash' ? <Trash2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
					</span>
				</div>
			</div>
		</div>
	);
}

export default BlogsOverviewCards;
