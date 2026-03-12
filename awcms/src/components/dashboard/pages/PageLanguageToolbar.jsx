import { Languages } from 'lucide-react';

function PageLanguageToolbar({
	t,
	languages,
	selectedLanguage,
	selectedLanguageLabel,
	onLanguageChange,
}) {
	return (
		<div className="mr-2 flex items-center gap-2">
			<span className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
				<Languages className="h-3.5 w-3.5" />
				{t('common.language') || 'Language'}
			</span>
			<select
				className="h-10 min-w-[150px] rounded-xl border border-border/70 bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				value={selectedLanguage}
				onChange={(event) => onLanguageChange(event.target.value)}
			>
				{languages.map((language) => (
					<option key={language.value} value={language.value}>
						{language.label}
					</option>
				))}
			</select>
			<span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary lg:inline-flex">
				{selectedLanguageLabel}
			</span>
		</div>
	);
}

export default PageLanguageToolbar;
