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

function TenantDeleteDialog({
	open,
	onOpenChange,
	tenantName,
	onConfirm,
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete <strong>{tenantName}</strong>? This action cannot be undone.
						 If the tenant has associated users or data, deletion might fail.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:opacity-95">
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default TenantDeleteDialog;
