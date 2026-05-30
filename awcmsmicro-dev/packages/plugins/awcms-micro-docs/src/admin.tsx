import { LinkButton } from "@cloudflare/kumo";
import { useLingui } from "@lingui/react";
import type { PluginAdminExports } from "emdash";
import * as React from "react";

import { getDocsCopy } from "./content.js";

function DocsAdminPage() {
	const { i18n } = useLingui();
	const copy = getDocsCopy(i18n.locale);

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<p className="text-sm font-medium uppercase tracking-[0.2em] text-kumo-subtle">
					{copy.kicker}
				</p>
				<h1 className="text-3xl font-semibold text-kumo-foreground">{copy.title}</h1>
				<p className="max-w-3xl text-sm leading-6 text-kumo-subtle">{copy.intro}</p>
				<div className="flex flex-wrap gap-3">
					<LinkButton href="/docs" external>
						{copy.viewPublicDocs}
					</LinkButton>
					<LinkButton href="/_emdash/admin" external>
						{copy.openAdmin}
					</LinkButton>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold text-kumo-foreground">{copy.prTitle}</h2>
				<p className="max-w-3xl text-sm leading-6 text-kumo-subtle">{copy.prIntro}</p>
				<div className="grid gap-3 md:grid-cols-3">
					{copy.prBullets.map((bullet) => (
						<article
							key={bullet}
							className="rounded-lg border border-kumo-border bg-kumo-background p-4 text-sm text-kumo-subtle"
						>
							{bullet}
						</article>
					))}
				</div>
				<div className="rounded-lg border border-kumo-border bg-kumo-background p-4">
					<h3 className="text-base font-semibold text-kumo-foreground">{copy.prBacklogTitle}</h3>
					<ul className="mt-3 grid gap-2 text-sm text-kumo-subtle md:grid-cols-2">
						{copy.prBacklog.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</div>
			</section>

			<section className="grid gap-4 lg:grid-cols-3">
				{copy.sections.map((section) => (
					<article
						key={section.title}
						className="rounded-lg border border-kumo-border bg-kumo-background p-4"
					>
						<h2 className="text-base font-semibold text-kumo-foreground">{section.title}</h2>
						<p className="mt-2 text-sm text-kumo-subtle">{section.intro}</p>
						<ul className="mt-3 space-y-2 text-sm text-kumo-subtle">
							{section.bullets.map((bullet) => (
								<li key={bullet}>{bullet}</li>
							))}
						</ul>
					</article>
				))}
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold text-kumo-foreground">{copy.referencesTitle}</h2>
				<div className="grid gap-3 md:grid-cols-2">
					{copy.references.map((reference) => (
						<article
							key={reference.title}
							className="rounded-lg border border-kumo-border bg-kumo-background p-4"
						>
							<h3 className="font-medium text-kumo-foreground">{reference.title}</h3>
							<p className="mt-1 text-sm text-kumo-subtle">{reference.description}</p>
						</article>
					))}
				</div>
			</section>
		</div>
	);
}

const pluginAdminExports: PluginAdminExports = {
	pages: {
		"/": <DocsAdminPage />,
	},
};

export default pluginAdminExports;
