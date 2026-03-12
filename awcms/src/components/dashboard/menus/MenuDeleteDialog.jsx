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

function MenuDeleteDialog({
	open,
	onOpenChange,
	menu,
	onConfirm,
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
					<AlertDialogDescription>
						{menu
							? `This will delete "${menu.label}" and hide it from the site.`
							: 'This will delete the selected menu item and hide it from the site.'}
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

export default MenuDeleteDialog;
