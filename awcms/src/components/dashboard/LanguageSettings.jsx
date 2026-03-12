import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe, Check, Languages, ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { AdminPageLayout, PageHeader } from '@/templates/flowbite-admin';
import { cn } from '@/lib/utils';

const LANGUAGE_OPTIONS = [
	{ value: 'id', name: 'Bahasa Indonesia', note: 'Secondary', flag: 'ID' },
	{ value: 'en', name: 'English', note: 'Default (Primary)', flag: 'EN' },
];

function LanguageSettings() {
	const { t, i18n } = useTranslation();
	const { user } = useAuth();
	const { toast } = useToast();
	const { hasPermission } = usePermissions();
	const [savingLanguage, setSavingLanguage] = useState('');

	const canReadLanguageSettings = hasPermission('tenant.languages.read');
	const canUpdateLanguageSettings = hasPermission('tenant.languages.update') || hasPermission('tenant.setting.update') || canReadLanguageSettings;

	const currentLanguage = i18n.language;
const currentLanguageLabel = useMemo(
		() => LANGUAGE_OPTIONS.find((language) => language.value === currentLanguage)?.name || currentLanguage.toUpperCase(),
		[currentLanguage]
	);

	useEffect(() => {
		if (!canReadLanguageSettings) {
			return;
		}

		if (!document.getElementById('google-translate-script')) {
			const script = document.createElement('script');
			script.id = 'google-translate-script';
			script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
			document.body.appendChild(script);

			window.googleTranslateElementInit = () => {
				new window.google.translate.TranslateElement(
					{ pageLanguage: 'en', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
					'google_translate_element'
				);
			};
		}
	}, [canReadLanguageSettings]);

	const handleLanguageChange = async (language) => {
		if (!canUpdateLanguageSettings || language === currentLanguage) {
			return;
		}

		setSavingLanguage(language);

		try {
			await i18n.changeLanguage(language);
			localStorage.setItem('i18nextLng', language);

			if (user) {
				const { error } = await supabase
					.from('users')
					.update({ language })
					.eq('id', user.id);

				if (error) {
					throw error;
				}
			}

			toast({
				title: t('common.success'),
				description: `${t('settings.save_preferences')} success`
			});
		} catch (error) {
			console.error('Language update failed:', error);
			toast({
				variant: 'destructive',
				title: t('common.error'),
				description: 'Failed to save language preference'
			});
		} finally {
			setSavingLanguage('');
		}
	};

	if (!canReadLanguageSettings) {
		return (
			<AdminPageLayout>
				<div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/70 p-12 text-center shadow-sm">
					<div className="mb-4 rounded-full border border-destructive/30 bg-destructive/10 p-4">
						<ShieldAlert className="h-12 w-12 text-destructive" />
					</div>
					<h3 className="text-xl font-bold text-foreground">Access Denied</h3>
					<p className="mt-2 text-muted-foreground">You do not have permission to view language settings.</p>
				</div>
			</AdminPageLayout>
		);
	}

	return (
		<AdminPageLayout requiredPermission="tenant.languages.read">
			<PageHeader
				title={t('settings.language_title')}
				description={t('settings.language_desc')}
				icon={Languages}
				breadcrumbs={[{ label: 'Settings' }, { label: 'Language', icon: Languages }]}
			/>

			<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current Language</p>
							<p className="mt-1 text-sm font-semibold text-foreground">{currentLanguageLabel}</p>
							<p className="text-xs text-muted-foreground">Locale code: {currentLanguage}</p>
						</div>
						<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
							<Languages className="h-4 w-4" />
						</span>
					</div>
				</div>

				<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Supported Locales</p>
							<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{LANGUAGE_OPTIONS.length}</p>
							<p className="text-xs text-muted-foreground">Configured in admin panel</p>
						</div>
						<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
							<Globe className="h-4 w-4" />
						</span>
					</div>
				</div>

				<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Preference Scope</p>
							<p className="mt-1 text-sm font-semibold text-foreground">User Profile</p>
							<p className="text-xs text-muted-foreground">Synced to user.language field</p>
						</div>
						<span className="rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
							<Check className="h-4 w-4" />
						</span>
					</div>
				</div>

				<div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Google Translate</p>
							<p className="mt-1 text-sm font-semibold text-foreground">Widget Enabled</p>
							<p className="text-xs text-muted-foreground">Browser side language assist</p>
						</div>
						<span className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
							<Globe className="h-4 w-4" />
						</span>
					</div>
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="space-y-6"
			>
				<div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur-sm">
					<h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
						<Globe className="h-5 w-5 text-primary" />
						{t('settings.select_language')}
					</h3>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{LANGUAGE_OPTIONS.map((language) => {
							const isActive = currentLanguage === language.value;
							const isSaving = savingLanguage === language.value;

							return (
								<button
									key={language.value}
									type="button"
									onClick={() => handleLanguageChange(language.value)}
									disabled={!canUpdateLanguageSettings || isSaving}
									className={cn(
										'flex items-center justify-between rounded-xl border p-4 text-left transition-all',
										isActive
											? 'border-primary bg-primary/10 ring-1 ring-primary/40'
											: 'border-border/70 bg-background/60 hover:border-primary/40 hover:bg-accent/40',
										(!canUpdateLanguageSettings || isSaving) && 'cursor-not-allowed opacity-70'
									)}
								>
									<div className="flex items-center gap-3">
										<span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background text-sm font-semibold text-foreground">
											{language.flag}
										</span>
										<div>
											<p className="font-semibold text-foreground">{language.name}</p>
											<p className="text-xs text-muted-foreground">{language.note}</p>
										</div>
									</div>
									{isActive ? (
										<Check className="h-5 w-5 text-primary" />
									) : isSaving ? (
										<span className="text-xs font-medium text-muted-foreground">Saving...</span>
									) : null}
								</button>
							);
						})}
					</div>
				</div>

				<div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur-sm">
					<h3 className="mb-2 text-lg font-semibold text-foreground">{t('settings.google_translate')}</h3>
					<p className="mb-4 text-sm text-muted-foreground">{t('settings.google_translate_desc')}</p>

					<div className="rounded-xl border border-border/70 bg-background/65 p-4">
						<div id="google_translate_element" />
					</div>
				</div>
			</motion.div>
		</AdminPageLayout>
	);
}

export default LanguageSettings;
