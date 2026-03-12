import { Trash2 } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { sanitizeHTML } from '@/utils/sanitize';

function UsersDeleteDialog({
	open,
	onOpenChange,
	userToDelete,
	onConfirm,
	t,
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						{t('users.delete.title')}
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3">
							<p
								dangerouslySetInnerHTML={{
									__html: sanitizeHTML(t('users.delete.confirm', { name: userToDelete?.full_name || userToDelete?.email })),
								}}
							/>
							<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
								<p className="font-medium">{t('users.delete.warning_role')}</p>
							</div>
							<div className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
								<p className="font-medium">{t('common.error')}:</p>
								<p>{t('users.delete.warning_restore')}</p>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:opacity-95">
						{t('common.move_to_trash')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default UsersDeleteDialog;
