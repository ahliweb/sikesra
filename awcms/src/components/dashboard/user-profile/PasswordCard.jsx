import { Key, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PasswordCard = ({
	passwordData,
	setPasswordData,
	passLoading,
	onSubmit,
}) => {
	return (
		<div className="dashboard-surface dashboard-surface-hover overflow-hidden">
			<div className="flex items-center gap-3 border-b border-slate-200/60 bg-slate-50/70 px-6 py-5 dark:border-slate-800/70 dark:bg-slate-900/60">
				<div className="p-2 bg-orange-100/70 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
					<Lock className="w-5 h-5" />
				</div>
				<div>
					<h3 className="font-semibold text-slate-900 dark:text-white">Password</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400">Manage your password</p>
				</div>
			</div>

			<div className="p-6">
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="password" className="text-slate-700 dark:text-slate-300">New Password</Label>
							<div className="relative">
								<Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
								<Input
									id="password"
									type="password"
									value={passwordData.password}
									onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
									className="h-11 rounded-xl border-slate-200/70 bg-white/90 pl-9 shadow-sm focus:border-indigo-500/60 focus:ring-indigo-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
									placeholder="••••••••"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirm Password</Label>
							<div className="relative">
								<Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
								<Input
									id="confirmPassword"
									type="password"
									value={passwordData.confirmPassword}
									onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
									className="h-11 rounded-xl border-slate-200/70 bg-white/90 pl-9 shadow-sm focus:border-indigo-500/60 focus:ring-indigo-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
									placeholder="••••••••"
								/>
							</div>
						</div>
					</div>

					<div className="pt-2 flex justify-end">
						<Button type="submit" variant="outline" disabled={passLoading || !passwordData.password} className="rounded-xl border-border/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground">
							{passLoading ? 'Updating...' : 'Update Password'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default PasswordCard;
