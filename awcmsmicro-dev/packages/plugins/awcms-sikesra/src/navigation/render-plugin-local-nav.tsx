import * as React from "react";
import { LinkButton } from "@cloudflare/kumo";
import type { NormalizedNavGroup } from "./normalize-admin-nav.js";
import { resolveLabel, type TranslationMessages } from "./resolve-label.js";

export interface PluginLocalNavProps {
	groups: NormalizedNavGroup[];
	currentPath: string;
	locale: string;
	defaultLocale?: string;
	messages?: TranslationMessages;
	title?: string;
	description?: string;
}

export function PluginLocalNav({
	groups,
	currentPath,
	locale,
	defaultLocale = "en",
	messages,
	title,
	description,
}: PluginLocalNavProps) {
	const fallbackTitle = locale.startsWith("id") ? "Operasi Plugin" : "Plugin Operations";
	const fallbackDescription = locale.startsWith("id") ? "Akses dan kelola fitur dari konsol ini." : "Access and manage features from this console.";
	const resolvedTitle = title || fallbackTitle;
	const resolvedDescription = description || fallbackDescription;
	const activeGroup = groups.find((group) =>
		group.items.some((item) =>
			currentPath.startsWith(item.path) || (item.children?.some((child) => currentPath.startsWith(child.path)))
		)
	) || groups[0];

	if (!groups.length || !activeGroup) return null;

	const getLocalizedName = (item: { labelKey: string; fallbackLabel: string }) => {
		return resolveLabel(item.labelKey, item.fallbackLabel, messages, locale, defaultLocale);
	};

	const activeItem = activeGroup.items.find((item) =>
		currentPath === item.path || currentPath.startsWith(item.path + "/") ||
			(item.children?.some((child) => currentPath === child.path || currentPath.startsWith(child.path + "/")))
	) || activeGroup.items[0];

	return (
		<section className="rounded-2xl border border-kumo-line bg-kumo-base p-4 text-kumo-default shadow-sm">
			<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
				<div>
					<div className="text-xs font-semibold uppercase tracking-wide text-kumo-subtle">
						{getLocalizedName(activeGroup)}
					</div>
					<h2 className="mt-1 text-lg font-semibold text-kumo-default">{resolvedTitle}</h2>
				</div>
				<p className="max-w-2xl text-sm leading-6 text-kumo-subtle">
					{resolvedDescription}
				</p>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				{activeGroup.items.map((item) => {
					const active = activeItem?.id === item.id;
					return (
						<LinkButton
							key={item.id}
							href={item.path}
							size="sm"
							variant={active ? "primary" : "secondary"}
							className="items-center gap-2"
						>
							<span>{getLocalizedName(item)}</span>
							{item.children?.length ? <span aria-hidden="true">⌄</span> : null}
						</LinkButton>
					);
				})}
			</div>

			{activeItem?.children?.length ? (
				<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{activeItem.children.map((child) => (
						<LinkButton
							key={child.id}
							href={child.path}
							variant="outline"
							className="h-auto flex-col items-start justify-start gap-1 p-4 text-start"
						>
							<span className="flex w-full items-center justify-between gap-2">
								<strong className="text-sm font-semibold text-kumo-default">
									{getLocalizedName(child)}
								</strong>
							</span>
						</LinkButton>
					))}
				</div>
			) : null}
		</section>
	);
}
