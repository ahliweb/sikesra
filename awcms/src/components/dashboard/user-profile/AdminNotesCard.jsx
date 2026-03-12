import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AdminNotesCard = ({
	adminData,
	setAdminData,
	adminLoading,
	onSubmit,
}) => {
	return (
		<div className="dashboard-surface dashboard-surface-hover overflow-hidden">
			<div className="flex items-center gap-3 border-b border-slate-200/60 bg-slate-50/70 px-6 py-5 dark:border-slate-800/70 dark:bg-slate-900/60">
				<div className="rounded-xl bg-rose-100/70 p-2 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
					<Shield className="w-5 h-5" />
				</div>
				<div>
					<h3 className="font-semibold text-slate-900 dark:text-white">Administrative Notes</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400">Encrypted admin-only fields</p>
				</div>
			</div>

			<div className="p-6">
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="admin_notes" className="text-sm font-medium text-slate-600 dark:text-slate-300">Admin Notes</Label>
						<Textarea
							id="admin_notes"
							value={adminData.admin_notes}
							onChange={(e) => setAdminData({ ...adminData, admin_notes: e.target.value })}
							className="min-h-[120px] rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-rose-500/60 focus:ring-rose-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
							placeholder="Sensitive notes for admin users only"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="admin_flags" className="text-sm font-medium text-slate-600 dark:text-slate-300">Admin Flags</Label>
						<Input
							id="admin_flags"
							value={adminData.admin_flags}
							onChange={(e) => setAdminData({ ...adminData, admin_flags: e.target.value })}
							className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-rose-500/60 focus:ring-rose-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
							placeholder="vip, compliance, sensitive"
						/>
						<p className="text-xs text-slate-500 dark:text-slate-400">Comma-separated, encrypted on save.</p>
					</div>
					<div className="pt-2 flex justify-end">
						<Button type="submit" disabled={adminLoading} className="rounded-xl bg-primary text-primary-foreground hover:opacity-95">
							{adminLoading ? 'Saving...' : 'Save Admin Fields'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AdminNotesCard;
