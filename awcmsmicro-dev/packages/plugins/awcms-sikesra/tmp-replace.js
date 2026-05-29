import fs from "node:fs";

const file = "/home/data/dev_react/awcms-micro/awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/src/admin.tsx";
let content = fs.readFileSync(file, "utf8");

// 1. Imports
if (!content.includes("@cloudflare/kumo")) {
    content = content.replace(
        'import * as React from "react";',
        'import { Button, Input, Select, InputArea } from "@cloudflare/kumo";\nimport * as React from "react";'
    );
}

// 2. Functional bug fixes
content = content.replace(/data\.roles\[0\]!\.slug/g, "data.roles[0]?.slug");
content = content.replace(/const roleSlug = selectedRole \|\| data\.roles\[0\]\?\.slug;/g, "const roleSlug = selectedRole || data.roles[0]?.slug || \"\";");

// 3. Inputs
content = content.replace(/<input\s+className="w-full[^"]*"\s+placeholder="([^"]+)"\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}\s*\/>/g, '<Input placeholder="$1" value={$2} onChange={(event) => $3} />');
content = content.replace(/<input\s+className="w-full[^"]*"\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}\s*\/>/g, '<Input value={$1} onChange={(event) => $2} />');

// 4. InputAreas
content = content.replace(/<textarea\s+className="w-full[^"]*"\s+placeholder="([^"]+)"\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}\s*\/>/g, '<InputArea placeholder="$1" value={$2} onChange={(event) => $3} />');
content = content.replace(/<textarea\s+className="w-full[^"]*"\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}\s*\/>/g, '<InputArea value={$1} onChange={(event) => $2} />');

// 5. Selects
content = content.replace(/<select\s+className="w-full[^"]*"\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}>/g, '<Select value={$1} onChange={(event) => $2}>');
content = content.replace(/<select\s+className="rounded[^"]*"\s+id=\{([^}]+)\}\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}>/g, '<Select id={$1} value={$2} onChange={(event) => $3}>');
content = content.replace(/<select\s+className="rounded[^"]*"\s+value=\{([^}]+)\}\s+onChange=\{\(event\) => ([^}]+)\}>/g, '<Select value={$1} onChange={(event) => $2}>');

// 6. Buttons
content = content.replace(/<button className="rounded bg-black[^"]*"\s+disabled=\{([^}]+)\}\s+type="([^"]+)">/g, '<Button variant="primary" disabled={$1} type="$2">');
content = content.replace(/<button className="rounded bg-black[^"]*"\s+type="([^"]+)">/g, '<Button variant="primary" type="$1">');
content = content.replace(/<button className="rounded bg-black[^"]*"\s+onClick=\{([^}]+)\}\s+type="([^"]+)">/g, '<Button variant="primary" onClick={$1} type="$2">');
content = content.replace(/<button className="text-xs text-kumo-subtle[^"]*"\s+onClick=\{([^}]+)\}>/g, '<Button variant="ghost" size="sm" onClick={$1}>');
content = content.replace(/<button className="rounded border[^"]*"\s+onClick=\{([^}]+)\}>/g, '<Button variant="secondary" size="sm" onClick={$1}>');
content = content.replace(/<button className="rounded border[^"]*"\s+onClick=\{([^}]+)\}\s+type="([^"]+)">/g, '<Button variant="secondary" onClick={$1} type="$2">');
content = content.replace(/<\/button>/g, '</Button>');

// Remove block span around label
content = content.replace(/<span className="mb-1 block">([^<]+)<\/span>/g, '<label className="block text-sm font-medium mb-1">$1</label>');
content = content.replace(/<label className="block text-sm">\s*<label/g, '<div><label');
content = content.replace(/<\/label>\s*<\/label>/g, '</div>');

fs.writeFileSync(file, content);
console.log("Done");
