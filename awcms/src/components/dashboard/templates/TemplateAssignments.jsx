import { useMemo, useState } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { usePermissions } from '@/contexts/PermissionContext';
import { hooks } from '@/lib/hooks';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Monitor, Smartphone, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BASE_ROUTES = [
	{ type: 'home', label: 'Home Page' },
	{ type: 'search', label: 'Search Results' },
	{ type: 'archive', label: 'Archive (Default)' },
	{ type: 'single', label: 'Single Post (Default)' },
	{ type: '404', label: '404 Not Found' },
	{ type: 'maintenance', label: 'Maintenance Mode' },
];

const CHANNELS = [
	{ value: 'web', label: 'Web (SSR/SSG)', icon: Monitor },
	{ value: 'mobile', label: 'Mobile App', icon: Smartphone },
	{ value: 'esp32', label: 'IoT (ESP32)', icon: Cpu },
];

const TemplateAssignments = () => {
	const { assignments, templates, updateAssignment, loading } = useTemplates();
	const { hasPermission } = usePermissions();
	const [selectedChannel, setSelectedChannel] = useState('web');

	const systemRoutes = useMemo(() => {
		return hooks.applyFilters('template_assignment_routes', [...BASE_ROUTES]);
	}, []);

	const getAssignedTemplateId = (routeType) => {
		const assignment = assignments.find((item) => item.route_type === routeType && item.channel === selectedChannel);
		return assignment?.template_id || 'default';
	};

	const handleAssignmentChange = async (routeType, value) => {
		if (!hasPermission('tenant.setting.update')) {
			return;
		}
		await updateAssignment(routeType, value, selectedChannel);
	};

	if (loading) {
		return <div className="rounded-2xl border border-border/60 bg-card/65 px-4 py-8 text-center text-muted-foreground">Loading assignments...</div>;
	}

	const pageTemplates = templates.filter((template) => template.type === 'page' || !template.type);

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground shadow-sm">
				Define default templates for system routes per channel. Individual pages can override the single-post assignment from page settings.
			</div>

			<div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
				<div className="flex flex-wrap gap-2">
					{CHANNELS.map((channel) => {
						const ChannelIcon = channel.icon;
						const active = selectedChannel === channel.value;

						return (
							<Button
								key={channel.value}
								type="button"
								variant={active ? 'default' : 'outline'}
								onClick={() => setSelectedChannel(channel.value)}
								className={cn(
									'h-9 rounded-xl px-3 shadow-sm',
									active
										? 'bg-primary text-primary-foreground hover:opacity-95'
										: 'border-border/70 bg-background/80 text-muted-foreground hover:bg-accent/70 hover:text-foreground'
								)}
							>
								<ChannelIcon className="mr-2 h-4 w-4" />
								{channel.label}
							</Button>
						);
					})}
				</div>
			</div>

			<div className="grid gap-4">
				{systemRoutes.map((route) => {
					const assignedId = getAssignedTemplateId(route.type);

					return (
						<div key={route.type} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/75 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
							<div>
								<h4 className="font-medium text-foreground">{route.label}</h4>
								<p className="mt-1 font-mono text-xs text-muted-foreground">Route: {route.type}</p>
							</div>

							<div className="w-full md:w-72">
								<Select
									value={assignedId || ''}
									onValueChange={(value) => handleAssignmentChange(route.type, value)}
									disabled={!hasPermission('tenant.setting.update')}
								>
									<SelectTrigger className="rounded-xl border-border/70 bg-background">
										<SelectValue placeholder="Select a template" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">
											<span className="italic text-muted-foreground">System Default</span>
										</SelectItem>
										{pageTemplates.map((template) => (
											<SelectItem key={template.id} value={template.id}>
												{template.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TemplateAssignments;
