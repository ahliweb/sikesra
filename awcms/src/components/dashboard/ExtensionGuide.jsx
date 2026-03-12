
import { ArrowLeft, Code, Book, Shield, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ExtensionGuide({ onBack }) {
   return (
      <div className="max-w-5xl mx-auto space-y-8 py-6">
         <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-accent/70">
               <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
               <h2 className="text-3xl font-bold text-foreground">Developer Guide</h2>
               <p className="text-muted-foreground">How to build and integrate extensions</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 bg-card/75">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     <Book className="h-5 w-5 text-primary" />
                     Overview
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  <p className="mb-4">
                     Extensions allow you to add new features, pages, and logic to the CMS without modifying core code.
                     They are stored in the database and loaded dynamically.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                     <li>Add custom pages to the dashboard sidebar</li>
                     <li>Register new permissions for ABAC</li>
                     <li>Store custom configuration via JSON</li>
                     <li>Hook into system events (lifecycle hooks)</li>
                  </ul>
               </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/75">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     <Code className="h-5 w-5 text-primary" />
                     Configuration Format
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                     {`{
  "routes": [
    {
      "path": "/my-plugin",
      "name": "My Plugin",
      "component": "MyPluginMain",
      "icon": "Puzzle" 
    }
  ],
  "permissions": [
    "view_my_plugin",
    "manage_my_plugin"
  ],
  "settings": {
    "apiKey": "..."
  }
}`}
                  </pre>
               </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/75">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     <Shield className="h-5 w-5 text-primary" />
                     ABAC Integration
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-muted-foreground">
                  <p className="mb-3">
                     Extensions fully integrate with the Attribute-Based Access Control system.
                  </p>
                  <div className="space-y-2">
                     <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                        <strong className="mb-1 block text-foreground">Defining Permissions</strong>
                        <p>Add permission keys to your config. Admin can then assign these to Roles.</p>
                     </div>
                     <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                        <strong className="mb-1 block text-foreground">Checking Access</strong>
                        <p>Use the <code>useExtension</code> hook or standard <code>usePermissions</code> context to check access in your components.</p>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/75">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     <Database className="h-5 w-5 text-primary" />
                     Data Persistence
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-muted-foreground">
                  <p className="mb-4">
                     Extensions typically need to store data. You have two options:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2">
                     <li>
                        <strong>Extension Config:</strong> Ideal for small settings, API keys, or preferences. Stored in the <code>config</code> JSONB column.
                     </li>
                     <li>
                        <strong>Custom Tables:</strong> For large datasets, create new tables in Supabase prefixed with your extension slug (e.g., <code>ext_analytics_events</code>).
                     </li>
                  </ol>
               </CardContent>
            </Card>
         </div>

         <div className="rounded-2xl border border-foreground/10 bg-gradient-to-br from-foreground to-foreground/90 p-8 text-primary-foreground">
            <div className="flex items-center gap-3 mb-4">
               <Zap className="h-6 w-6 text-amber-300" />
               <h3 className="text-xl font-bold">Pro Tip: Extension Hooks</h3>
            </div>
            <p className="mb-6 max-w-3xl text-primary-foreground/80">
               Use standard React hooks to interact with the CMS core. The <code>useExtension</code> hook provides
               a safe sandbox to access user details, toast notifications, and navigation without breaking the app.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                  <code className="mb-2 block text-amber-300">onActivate()</code>
                  <p className="text-xs text-primary-foreground/70">Triggered when admin enables the extension. Use this to initialize data or check dependencies.</p>
               </div>
               <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                  <code className="mb-2 block text-amber-300">onDeactivate()</code>
                  <p className="text-xs text-primary-foreground/70">Triggered on disable. Cleanup resources, stop listeners, or clear temporary state.</p>
               </div>
            </div>
         </div>
      </div>
   );
}

export default ExtensionGuide;
