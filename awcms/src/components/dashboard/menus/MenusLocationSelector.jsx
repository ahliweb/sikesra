import { LayoutTemplate } from 'lucide-react';

function MenusLocationSelector({ locations, currentLocation, onChangeLocation }) {
	const activeLocation = locations.find((location) => location.id === currentLocation);

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/75 p-4 shadow-sm md:flex-row md:items-center">
			<div className="flex items-center gap-2 text-muted-foreground">
				<LayoutTemplate className="h-5 w-5" />
				<span className="text-sm font-medium">Menu Location:</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{locations.map((location) => (
					<button
						key={location.id}
						type="button"
						onClick={() => onChangeLocation(location.id)}
						className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currentLocation === location.id
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'border border-border/70 bg-background text-muted-foreground hover:bg-accent/60 hover:text-foreground'
							}`}
					>
						{location.label}
					</button>
				))}
			</div>
			<div className="hidden flex-1 text-right text-xs text-muted-foreground md:block">
				Managing: <strong>{activeLocation?.label}</strong>
			</div>
		</div>
	);
}

export default MenusLocationSelector;
