function MenusLocaleSelector({ locales, currentLocale, onChangeLocale }) {
	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/75 p-4 shadow-sm md:flex-row md:items-center">
			<div className="flex items-center gap-2 text-muted-foreground">
				<span className="text-sm font-medium">Language:</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{locales.map((locale) => (
					<button
						key={locale.code}
						type="button"
						onClick={() => onChangeLocale(locale.code)}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currentLocale === locale.code
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'border border-border/70 bg-background text-muted-foreground hover:bg-accent/60 hover:text-foreground'
							}`}
					>
						<span>{locale.flag}</span>
						{locale.label}
					</button>
				))}
			</div>
		</div>
	);
}

export default MenusLocaleSelector;
