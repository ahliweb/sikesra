import { Sparkles, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function BlogsToolbarActions({
	t,
	languages,
	selectedLanguage,
	selectedLanguageLabel,
	onLanguageChange,
	onCreateVisual,
}) {
	return (
		<div className="mr-2 flex flex-wrap items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" className="h-10 rounded-xl border-border/70 bg-background px-3 text-muted-foreground shadow-sm hover:bg-accent/70 hover:text-foreground">
						<Languages className="mr-2 h-4 w-4" />
						{languages.find((language) => language.code === selectedLanguage)?.label || 'Language'}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{languages.map((language) => (
						<DropdownMenuItem key={language.code} onClick={() => onLanguageChange(language.code)}>
							<span className="mr-2">{language.flag}</span>
							{language.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<span className="hidden items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
				{selectedLanguageLabel}
			</span>
			<Button
				onClick={onCreateVisual}
				className="h-10 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm hover:opacity-95"
			>
				<Sparkles className="mr-2 h-4 w-4" />
				{t('common.create', 'Create')} {t('blogs.visual_builder')}
			</Button>
		</div>
	);
}

export default BlogsToolbarActions;
