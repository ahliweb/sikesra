import { Check } from 'lucide-react';
import { shadcnHslToHex } from '@/lib/themeUtils';

function MiniThemePreview({ config, isActive }) {
  const primary = shadcnHslToHex(config?.colors?.primary) || '#3b82f6';
  const bg = shadcnHslToHex(config?.colors?.background) || '#ffffff';
  const card = shadcnHslToHex(config?.colors?.card) || '#ffffff';
  const text = shadcnHslToHex(config?.colors?.foreground) || '#000000';
  const secondary = shadcnHslToHex(config?.colors?.secondary) || '#f1f5f9';

  return (
    <div className="relative h-32 w-full overflow-hidden rounded-t-lg border-b border-slate-100" style={{ backgroundColor: bg }}>
      <div className="flex h-6 w-full items-center gap-2 border-b border-black/5 px-3" style={{ backgroundColor: bg }}>
        <div className="h-2 w-12 rounded-full opacity-80" style={{ backgroundColor: primary }}></div>
        <div className="flex-1"></div>
        <div className="h-4 w-4 rounded-full opacity-50" style={{ backgroundColor: secondary }}></div>
      </div>

      <div className="flex h-full gap-2 p-3">
        <div className="hidden h-20 w-1/4 rounded opacity-50 sm:block" style={{ backgroundColor: secondary }}></div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-3/4 rounded opacity-80" style={{ backgroundColor: text }}></div>
          <div className="h-2 w-1/2 rounded opacity-40" style={{ backgroundColor: text }}></div>
          <div className="mt-2 rounded border border-black/5 p-2 shadow-sm" style={{ backgroundColor: card }}>
            <div className="mb-1 h-8 w-8 rounded opacity-90" style={{ backgroundColor: primary }}></div>
            <div className="mb-1 h-1.5 w-full rounded opacity-30" style={{ backgroundColor: text }}></div>
            <div className="h-1.5 w-2/3 rounded opacity-30" style={{ backgroundColor: text }}></div>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Check className="h-3 w-3" /> ACTIVE
        </div>
      )}
    </div>
  );
}

export default MiniThemePreview;
