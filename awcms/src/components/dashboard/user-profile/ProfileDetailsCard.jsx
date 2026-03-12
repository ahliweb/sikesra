import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ProfileDetailsCard = ({
	profileDetails,
	setProfileDetails,
	detailsLoading,
	onSubmit,
}) => {
	return (
		<div className="dashboard-surface dashboard-surface-hover overflow-hidden">
			<div className="flex items-center gap-3 border-b border-slate-200/60 bg-slate-50/70 px-6 py-5 dark:border-slate-800/70 dark:bg-slate-900/60">
				<div className="rounded-xl bg-emerald-100/70 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
					<FileText className="w-5 h-5" />
				</div>
				<div>
					<h3 className="font-semibold text-slate-900 dark:text-white">Profile Details</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400">Add richer profile information</p>
				</div>
			</div>

			<div className="p-6">
				<form onSubmit={onSubmit} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="description" className="text-sm font-medium text-slate-600 dark:text-slate-300">Profile Description</Label>
						<Textarea
							id="description"
							value={profileDetails.description}
							onChange={(e) => setProfileDetails({ ...profileDetails, description: e.target.value })}
							className="min-h-[120px] rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
							placeholder="Share a short bio or summary"
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="job_title" className="text-sm font-medium text-slate-600 dark:text-slate-300">Job Title</Label>
							<Input
								id="job_title"
								value={profileDetails.job_title}
								onChange={(e) => setProfileDetails({ ...profileDetails, job_title: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="e.g. Operations Lead"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="department" className="text-sm font-medium text-slate-600 dark:text-slate-300">Department</Label>
							<Input
								id="department"
								value={profileDetails.department}
								onChange={(e) => setProfileDetails({ ...profileDetails, department: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="e.g. Student Affairs"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="phone" className="text-sm font-medium text-slate-600 dark:text-slate-300">Phone</Label>
							<Input
								id="phone"
								value={profileDetails.phone}
								onChange={(e) => setProfileDetails({ ...profileDetails, phone: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="+62 812-3456-7890"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="alternate_email" className="text-sm font-medium text-slate-600 dark:text-slate-300">Alternate Email</Label>
							<Input
								id="alternate_email"
								type="email"
								value={profileDetails.alternate_email}
								onChange={(e) => setProfileDetails({ ...profileDetails, alternate_email: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="secondary@email.com"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="location" className="text-sm font-medium text-slate-600 dark:text-slate-300">Location</Label>
							<Input
								id="location"
								value={profileDetails.location}
								onChange={(e) => setProfileDetails({ ...profileDetails, location: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="City, Province"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="timezone" className="text-sm font-medium text-slate-600 dark:text-slate-300">Timezone</Label>
							<Input
								id="timezone"
								value={profileDetails.timezone}
								onChange={(e) => setProfileDetails({ ...profileDetails, timezone: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="Asia/Jakarta"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="website_url" className="text-sm font-medium text-slate-600 dark:text-slate-300">Website</Label>
							<Input
								id="website_url"
								value={profileDetails.website_url}
								onChange={(e) => setProfileDetails({ ...profileDetails, website_url: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="https://your-site.com"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="linkedin_url" className="text-sm font-medium text-slate-600 dark:text-slate-300">LinkedIn</Label>
							<Input
								id="linkedin_url"
								value={profileDetails.linkedin_url}
								onChange={(e) => setProfileDetails({ ...profileDetails, linkedin_url: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="https://linkedin.com/in/username"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="twitter_url" className="text-sm font-medium text-slate-600 dark:text-slate-300">Twitter/X</Label>
							<Input
								id="twitter_url"
								value={profileDetails.twitter_url}
								onChange={(e) => setProfileDetails({ ...profileDetails, twitter_url: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="https://x.com/username"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="github_url" className="text-sm font-medium text-slate-600 dark:text-slate-300">GitHub</Label>
							<Input
								id="github_url"
								value={profileDetails.github_url}
								onChange={(e) => setProfileDetails({ ...profileDetails, github_url: e.target.value })}
								className="h-11 rounded-xl border-slate-200/70 bg-white/90 shadow-sm focus:border-emerald-500/60 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
								placeholder="https://github.com/username"
							/>
						</div>
					</div>

					<div className="pt-2 flex justify-end">
						<Button type="submit" disabled={detailsLoading} className="rounded-xl bg-primary text-primary-foreground hover:opacity-95">
							{detailsLoading ? 'Saving...' : 'Save Details'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ProfileDetailsCard;
