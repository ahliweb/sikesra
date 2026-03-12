import { AlertCircle, Camera, Mail, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/ImageUpload';

const PersonalInformationCard = ({
	profileData,
	setProfileData,
	loading,
	onSubmit,
}) => {
	return (
		<div className="dashboard-surface dashboard-surface-hover overflow-hidden">
			<div className="flex items-center gap-3 border-b border-slate-200/60 bg-slate-50/70 px-6 py-5 dark:border-slate-800/70 dark:bg-slate-900/60">
				<div className="rounded-xl bg-blue-100/70 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
					<User className="w-5 h-5" />
				</div>
				<div>
					<h3 className="font-semibold text-slate-900 dark:text-white">Personal Information</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400">Update your personal details</p>
				</div>
			</div>

			<div className="p-6">
				<form onSubmit={onSubmit} className="space-y-6">
					<div className="grid gap-6 md:grid-cols-[200px,1fr]">
						<div className="flex flex-col items-center gap-3 md:items-start md:text-left">
							<div className="relative group">
								<div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-200/70 bg-slate-100 shadow-md dark:border-slate-800 dark:bg-slate-900">
									{profileData.avatar_url ? (
										<img
											src={profileData.avatar_url}
											alt="Profile"
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center bg-blue-100/70 dark:bg-blue-900/30">
											<User className="w-10 h-10 text-blue-400 dark:text-blue-300" />
										</div>
									)}
								</div>
								<button
									type="button"
									onClick={() => document.getElementById('avatar-upload-trigger').click()}
									className="absolute bottom-1 right-1 p-2 bg-blue-600 rounded-full text-white shadow-lg ring-2 ring-white transition-colors hover:bg-blue-700 dark:ring-slate-900"
								>
									<Camera className="w-4 h-4" />
								</button>
							</div>
							<div className="text-center text-xs text-slate-500 dark:text-slate-400 md:text-left">
								JPG/PNG up to 2MB
							</div>
						</div>
						<div className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/50">
							<ImageUpload
								id="avatar-upload-trigger"
								value={profileData.avatar_url}
								onChange={(url) => setProfileData({ ...profileData, avatar_url: url })}
								className="h-auto"
								hidePreview
							/>
							<p className="text-xs text-slate-500 dark:text-slate-400">Use Media Library or paste an external URL.</p>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="full_name" className="text-sm font-medium text-slate-600 dark:text-slate-300">Full Name</Label>
							<div className="relative">
								<User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
								<Input
									id="full_name"
									value={profileData.full_name}
									onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
									className="h-11 rounded-xl border-slate-200/70 bg-white/90 pl-9 shadow-sm focus:border-indigo-500/60 focus:ring-indigo-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
									placeholder="Your full name"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium text-slate-600 dark:text-slate-300">Email Address</Label>
							<div className="relative">
								<Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
								<Input
									id="email"
									type="email"
									value={profileData.email}
									onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
									className="h-11 rounded-xl border-slate-200/70 bg-white/90 pl-9 shadow-sm focus:border-indigo-500/60 focus:ring-indigo-500/30 dark:border-slate-700/70 dark:bg-slate-950/60"
									placeholder="your.email@example.com"
								/>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
								<AlertCircle className="w-3 h-3" />
								Changing email will require re-verification.
							</p>
						</div>
					</div>

					<div className="pt-2 flex justify-end">
						<Button type="submit" disabled={loading} className="rounded-xl bg-primary text-primary-foreground hover:opacity-95">
							{loading ? (
								<span className="flex items-center gap-2">Saving...</span>
							) : (
								<span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</span>
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default PersonalInformationCard;
