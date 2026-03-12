import ContentTable from '@/components/dashboard/ContentTable';

function UsersTableSection({
	t,
	currentPage,
	users,
	columns,
	loading,
	canEdit,
	canDelete,
	onEdit,
	onDelete,
	totalItems,
	itemsPerPage,
	onPageChange,
	onLimitChange,
}) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between px-1">
				<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
					{t('users.breadcrumbs.users')}
				</p>
				<p className="text-xs text-muted-foreground">
					{t('common.page', 'Page')} {currentPage}
				</p>
			</div>

			<ContentTable
				data={users}
				columns={columns}
				loading={loading}
				onEdit={canEdit ? onEdit : null}
				onDelete={canDelete ? onDelete : null}
				pagination={{
					currentPage,
					totalPages: Math.ceil(totalItems / itemsPerPage),
					totalItems,
					itemsPerPage,
					onPageChange,
					onLimitChange,
				}}
			/>
		</div>
	);
}

export default UsersTableSection;
