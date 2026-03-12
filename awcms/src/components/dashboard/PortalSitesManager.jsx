/**
 * PortalSitesManager - Manage public portal site URLs per tenant.
 *
 * Allows tenant admins to add/edit/remove portal sites (e.g., primary,
 * smandapbun) so the PageEditor preview and other features can target
 * the correct portal.
 */
import { useState } from 'react';
import { Globe, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { usePortalSites } from '@/hooks/usePortalSites';

export default function PortalSitesManager() {
    const { portals, loading, savePortals } = usePortalSites();
    const { toast } = useToast();
    const [localPortals, setLocalPortals] = useState(null);
    const [saving, setSaving] = useState(false);

    // Use local copy once user starts editing
    const currentPortals = localPortals ?? portals;

    const handleChange = (idx, field, value) => {
        const updated = [...currentPortals];
        updated[idx] = { ...updated[idx], [field]: value };
        setLocalPortals(updated);
    };

    const handleAdd = () => {
        setLocalPortals([...currentPortals, { name: '', url: '' }]);
    };

    const handleRemove = (idx) => {
        if (currentPortals.length <= 1) {
            toast({ variant: 'destructive', title: 'Error', description: 'At least one portal is required.' });
            return;
        }
        const updated = currentPortals.filter((_, i) => i !== idx);
        setLocalPortals(updated);
    };

    const handleSave = async () => {
        // Validate
        for (const portal of currentPortals) {
            if (!portal.name?.trim() || !portal.url?.trim()) {
                toast({ variant: 'destructive', title: 'Validation Error', description: 'All portals must have a name and URL.' });
                return;
            }
            try {
                new URL(portal.url);
            } catch {
                toast({ variant: 'destructive', title: 'Invalid URL', description: `"${portal.url}" is not a valid URL.` });
                return;
            }
        }

        setSaving(true);
        const { error } = await savePortals(currentPortals);
        setSaving(false);

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error });
        } else {
            setLocalPortals(null); // Reset local state to sync with saved
            toast({ title: 'Saved', description: 'Portal sites updated successfully.' });
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading portal sites...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                    <Globe className="w-4 h-4 text-blue-600" /> Public Portal Sites
                </h4>
                <Button variant="outline" size="sm" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-1" /> Add Portal
                </Button>
            </div>

            <p className="text-xs text-slate-500">
                Configure the public-facing portal URLs for this tenant. The admin panel
                will use these for page previews and content sync.
            </p>

            <div className="space-y-3">
                {currentPortals.map((portal, idx) => (
                    <div key={idx} className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-slate-500">Portal Name</Label>
                            <Input
                                value={portal.name}
                                onChange={(e) => handleChange(idx, 'name', e.target.value)}
                                placeholder="e.g., Primary, Smandapbun"
                                className="h-9"
                            />
                        </div>
                        <div className="flex-[2] space-y-1">
                            <Label className="text-xs text-slate-500">URL</Label>
                            <Input
                                value={portal.url}
                                onChange={(e) => handleChange(idx, 'url', e.target.value)}
                                placeholder="https://example.com"
                                className="h-9 font-mono text-sm"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-9 w-9"
                            onClick={() => handleRemove(idx)}
                            disabled={currentPortals.length <= 1}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>

            {localPortals && (
                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={saving} size="sm">
                        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                        {saving ? 'Saving...' : 'Save Portal Sites'}
                    </Button>
                </div>
            )}
        </div>
    );
}
