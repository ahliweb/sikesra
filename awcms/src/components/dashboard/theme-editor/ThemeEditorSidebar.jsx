import { Layout, Palette as PaletteIcon, RotateCcw, Type } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { shadcnHslToHex } from '@/lib/themeUtils';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = [
  { label: 'Inter (Default)', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Playfair Display (Serif)', value: '"Playfair Display", serif' },
  { label: 'Merriweather (Serif)', value: 'Merriweather, serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
];

function ColorRow({ label, configKey, description, currentColors, handleColorChange, canEdit }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <div className="flex flex-col gap-0.5">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded border border-border bg-muted px-2 py-1 font-mono text-xs uppercase text-muted-foreground">
          {shadcnHslToHex(currentColors?.[configKey])}
        </span>
        <div className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-border shadow-sm transition-transform hover:scale-105 active:scale-95 ring-offset-2 focus-within:ring-2 focus-within:ring-primary">
          <input
            type="color"
            className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0 opacity-0"
            value={shadcnHslToHex(currentColors?.[configKey])}
            onChange={(event) => handleColorChange(configKey, event.target.value)}
            disabled={!canEdit}
          />
          <div
            className="pointer-events-none h-full w-full"
            style={{ backgroundColor: shadcnHslToHex(currentColors?.[configKey]) }}
          />
        </div>
      </div>
    </div>
  );
}

function ThemeEditorSidebar({
  t,
  activeTab,
  baseEditPath,
  navigate,
  name,
  setName,
  canEdit,
  colorMode,
  setColorMode,
  config,
  handleFontChange,
  handleRadiusChange,
  handleColorChange,
  resetDialogOpen,
  setResetDialogOpen,
  handleReset,
}) {
  const currentColors = colorMode === 'light' ? config.colors : config.darkColors;
  const modeLabel = colorMode === 'light' ? 'Light' : 'Dark';

  return (
    <div className="flex w-[380px] shrink-0 flex-col overflow-hidden border-r border-border/70 bg-card/85 backdrop-blur-sm">
      <div className="border-b border-border/70 p-4">
        <div className="mb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('theme_editor.info_label')}</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('theme_editor.theme_name_placeholder')}
              disabled={!canEdit}
              className="rounded-xl border-border/70 bg-background"
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (!baseEditPath) return;
            if (value === 'colors') {
              navigate(baseEditPath);
            } else {
              navigate(`${baseEditPath}/${value}`);
            }
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 rounded-xl border border-border/60 bg-background/70 p-1">
            <TabsTrigger value="colors" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <PaletteIcon className="mr-1.5 h-3.5 w-3.5" /> {t('theme_editor.tabs.colors')}
            </TabsTrigger>
            <TabsTrigger value="typography" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Type className="mr-1.5 h-3.5 w-3.5" /> {t('theme_editor.tabs.typography')}
            </TabsTrigger>
            <TabsTrigger value="layout" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Layout className="mr-1.5 h-3.5 w-3.5" /> {t('theme_editor.tabs.layout')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="colors" className="mt-0 space-y-6">
            <div className="mb-4 flex gap-2">
              <div className="flex flex-1 rounded-xl border border-border/60 bg-background/70 p-1">
                <button
                  className={cn(
                    'flex-1 rounded-lg py-1 text-xs font-medium transition-all',
                    colorMode === 'light'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setColorMode('light')}
                >
                  Light Mode
                </button>
                <button
                  className={cn(
                    'flex-1 rounded-lg py-1 text-xs font-medium transition-all',
                    colorMode === 'dark'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setColorMode('dark')}
                >
                  Dark Mode
                </button>
              </div>
              <Button variant="outline" size="icon" onClick={() => setResetDialogOpen(true)} title="Reset to Defaults" className="h-[34px] w-[34px] shrink-0 rounded-lg border-border/70">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">{t('theme_editor.colors.base_title')}</h3>
              <div className="rounded-xl border border-border/70 bg-card/70 p-1 px-3 shadow-sm">
                <ColorRow label={t('theme_editor.colors.background')} configKey="background" description={t('theme_editor.colors.background_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.foreground')} configKey="foreground" description={t('theme_editor.colors.foreground_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">{t('theme_editor.colors.brand_title')}</h3>
              <div className="rounded-xl border border-border/70 bg-card/70 p-1 px-3 shadow-sm">
                <ColorRow label={t('theme_editor.colors.primary')} configKey="primary" description={t('theme_editor.colors.primary_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.primary_text')} configKey="primaryForeground" description={t('theme_editor.colors.primary_text_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.secondary')} configKey="secondary" description={t('theme_editor.colors.secondary_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.secondary_text')} configKey="secondaryForeground" description={t('theme_editor.colors.secondary_text_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.accent')} configKey="accent" description={t('theme_editor.colors.accent_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">{t('theme_editor.colors.ui_title')}</h3>
              <div className="rounded-xl border border-border/70 bg-card/70 p-1 px-3 shadow-sm">
                <ColorRow label={t('theme_editor.colors.border')} configKey="border" description={t('theme_editor.colors.border_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.input')} configKey="input" description={t('theme_editor.colors.input_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.card')} configKey="card" description={t('theme_editor.colors.card_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
                <ColorRow label={t('theme_editor.colors.destructive')} configKey="destructive" description={t('theme_editor.colors.destructive_desc')} currentColors={currentColors} handleColorChange={handleColorChange} canEdit={canEdit} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="mt-0 space-y-6">
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">{t('theme_editor.typography.font_families')}</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('theme_editor.typography.headings_font')}</Label>
                  <Select value={config.fonts?.heading} onValueChange={(value) => handleFontChange('heading', value)}>
                    <SelectTrigger disabled={!canEdit} className="rounded-xl border-border/70 bg-background">
                      <SelectValue placeholder={t('theme_editor.typography.select_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('theme_editor.typography.headings_desc')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t('theme_editor.typography.body_font')}</Label>
                  <Select value={config.fonts?.body} onValueChange={(value) => handleFontChange('body', value)}>
                    <SelectTrigger disabled={!canEdit} className="rounded-xl border-border/70 bg-background">
                      <SelectValue placeholder={t('theme_editor.typography.select_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('theme_editor.typography.body_desc')}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="mt-0 space-y-6">
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">{t('theme_editor.layout.border_radius')}</h3>
              <div className="rounded-xl border border-border/70 bg-card/70 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <Label>{t('theme_editor.layout.corner_roundness')}</Label>
                  <span className="rounded border border-border/70 bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{config.radius}rem</span>
                </div>
                <Slider
                  value={[parseFloat(config.radius || 0.5)]}
                  max={2}
                  step={0.1}
                  onValueChange={handleRadiusChange}
                  disabled={!canEdit}
                />
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{t('theme_editor.layout.square')}</span>
                  <span>{t('theme_editor.layout.round')}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {modeLabel} Mode Colors?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current {modeLabel.toLowerCase()} mode palette with the default values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset Colors</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ThemeEditorSidebar;
