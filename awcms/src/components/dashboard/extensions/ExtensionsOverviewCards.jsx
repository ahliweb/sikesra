import { Blocks, Puzzle, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function ExtensionsOverviewCards({
	extensionsCount,
	activeExtensionsCount,
	ownedExtensionsCount,
	searchActive,
	searchTerm,
}) {
	return (
		<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Installed</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{extensionsCount}</p>
						<p className="text-xs text-muted-foreground">Total extensions</p>
					</div>
					<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
						<Blocks className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{activeExtensionsCount}</p>
						<p className="text-xs text-muted-foreground">Running now</p>
					</div>
					<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
						<Sparkles className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Owned By You</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{ownedExtensionsCount}</p>
						<p className="text-xs text-muted-foreground">Creator access</p>
					</div>
					<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
						<Puzzle className="h-4 w-4" />
					</span>
				</div>
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Search</p>
						<p className="mt-1 text-sm font-semibold text-foreground">{searchActive ? searchTerm : 'No filter'}</p>
						<p className="text-xs text-muted-foreground">{searchActive ? 'Filtered results' : 'All extensions'}</p>
					</div>
					<span className={cn(
						'rounded-xl border p-2',
						searchActive
							? 'border-primary/25 bg-primary/10 text-primary'
							: 'border-border/70 bg-background/70 text-muted-foreground'
					)}>
						<Search className="h-4 w-4" />
					</span>
				</div>
			</div>
		</div>
	);
}

export default ExtensionsOverviewCards;
