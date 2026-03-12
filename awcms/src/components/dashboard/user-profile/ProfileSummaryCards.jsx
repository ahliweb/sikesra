import { Shield, CheckCircle2, FileText, Mail } from 'lucide-react';

const ProfileSummaryCards = ({
	effectiveRole,
	isPlatformScope,
	permissionCount,
	completedDetailFields,
	primaryEmail,
}) => (
	<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current Role</p>
					<p className="mt-1 text-sm font-semibold capitalize text-foreground">{effectiveRole}</p>
					<p className="text-xs text-muted-foreground">{isPlatformScope ? 'Platform scope' : 'Tenant scope'}</p>
				</div>
				<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
					<Shield className="h-4 w-4" />
				</span>
			</div>
		</div>

		<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Permissions</p>
					<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{permissionCount}</p>
					<p className="text-xs text-muted-foreground">Assigned access keys</p>
				</div>
				<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
					<CheckCircle2 className="h-4 w-4" />
				</span>
			</div>
		</div>

		<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Profile Details</p>
					<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{completedDetailFields}</p>
					<p className="text-xs text-muted-foreground">Filled detail fields</p>
				</div>
				<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
					<FileText className="h-4 w-4" />
				</span>
			</div>
		</div>

		<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Primary Email</p>
					<p className="mt-1 truncate text-sm font-semibold text-foreground">{primaryEmail}</p>
					<p className="text-xs text-muted-foreground">Account login identity</p>
				</div>
				<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
					<Mail className="h-4 w-4" />
				</span>
			</div>
		</div>
	</div>
);

export default ProfileSummaryCards;
