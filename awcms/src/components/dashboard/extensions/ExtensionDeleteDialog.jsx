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

function ExtensionDeleteDialog({
	t,
	extension,
	onOpenChange,
	onConfirm,
}) {
	return (
		<AlertDialog open={Boolean(extension)} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Extension?</AlertDialogTitle>
					<AlertDialogDescription>
						{extension
							? `This will move "${extension.name}" to trash and deactivate it.`
							: 'This extension will be moved to trash.'}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
						{t('common.delete', 'Delete')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default ExtensionDeleteDialog;
