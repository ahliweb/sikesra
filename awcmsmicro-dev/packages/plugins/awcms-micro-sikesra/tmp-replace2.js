import fs from "node:fs";

const file =
	"/home/data/dev_react/awcms-micro/awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/src/admin.tsx";
let content = fs.readFileSync(file, "utf8");

// 1. Imports
if (!content.includes("@cloudflare/kumo")) {
	content = content.replace(
		'import * as React from "react";',
		'import { Button, Input, Select, InputArea } from "@cloudflare/kumo";\nimport * as React from "react";',
	);
}

// 2. Functional bug fixes
content = content.replace(/data\.roles\[0\]!\.slug/g, "data.roles[0]?.slug");
content = content.replace(
	/const roleSlug = selectedRole \|\| data\.roles\[0\]\?\.slug;/g,
	'const roleSlug = selectedRole || data.roles[0]?.slug || "";',
);

// 3. Components
content = content.replace(/<input\s+className="w-full[^"]*"/g, "<Input ");
content = content.replace(/<textarea\s+className="w-full[^"]*"/g, "<InputArea ");
content = content.replace(/<select\s+className="w-full[^"]*"/g, "<Select ");
content = content.replace(/<select\s+className="rounded[^"]*"/g, "<Select ");
content = content.replace(/<\/select>/g, "</Select>");

// Buttons
content = content.replace(
	/<button className="rounded bg-black[^"]*"/g,
	'<Button variant="primary" ',
);
content = content.replace(
	/<button className="text-xs text-kumo-subtle[^"]*"/g,
	'<Button variant="ghost" size="sm" ',
);
content = content.replace(
	/<button className="rounded border[^"]*"/g,
	'<Button variant="secondary" size="sm" ',
);
content = content.replace(/<\/button>/g, "</Button>");

fs.writeFileSync(file, content);
console.log("Done");
