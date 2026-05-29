import fs from "node:fs";

const file = "/home/data/dev_react/awcms-micro/awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/src/admin.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(/onChange=\{\(event\) =>/g, 'onChange={(event: any) =>');
content = content.replace(/onChange=\{\(e\) =>/g, 'onChange={(e: any) =>');

fs.writeFileSync(file, content);
console.log("Done");
