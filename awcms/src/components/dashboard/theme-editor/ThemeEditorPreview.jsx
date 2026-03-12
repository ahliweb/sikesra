import { Palette as PaletteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function ThemeEditorPreview({ t, previewMode, colorMode }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-muted/25 to-background p-8">
      <div className="pointer-events-none absolute inset-0 pattern-grid opacity-[0.03]"></div>

      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
        <span className="font-medium text-foreground">Preview</span>
        <span>•</span>
        <span className="capitalize">{previewMode}</span>
        <span>•</span>
        <span>{colorMode === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
      </div>

      <div
        className={`rounded-2xl border border-border bg-background text-foreground shadow-2xl transition-all duration-300 ease-in-out overflow-y-auto ${previewMode === 'mobile' ? 'h-[667px] w-[375px]' : 'h-full w-full max-w-5xl'}`}
      >
        <div className={`flex min-h-full flex-col font-sans ${colorMode === 'dark' ? 'dark' : ''}`}>
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-6">
              <div className="font-heading text-xl font-bold text-primary">{t('theme_editor.preview.brand')}</div>
              <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
                <button className="cursor-default text-foreground transition-colors hover:text-primary">{t('theme_editor.preview.nav.home')}</button>
                <button className="cursor-default transition-colors hover:text-primary">{t('theme_editor.preview.nav.about')}</button>
              </nav>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">{t('theme_editor.preview.nav.login')}</Button>
                <Button size="sm">{t('theme_editor.preview.nav.get_started')}</Button>
              </div>
            </div>
          </header>

          <section className="bg-secondary/30 px-6 py-20 text-center">
            <div className="mx-auto max-w-3xl space-y-6">
              <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                {t('theme_editor.preview.hero.title_start')} <span className="text-primary">{t('theme_editor.preview.hero.title_end')}</span>
              </h1>
              <p className="font-sans text-lg text-muted-foreground md:text-xl">
                {t('theme_editor.preview.hero.subtitle')}
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <Button size="lg" className="rounded-full">{t('theme_editor.preview.hero.start_building')}</Button>
                <Button size="lg" variant="outline" className="rounded-full">{t('theme_editor.preview.hero.learn_more')}</Button>
              </div>
            </div>
          </section>

          <section className="bg-background px-6 py-16">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-8 text-center font-heading text-2xl font-bold">{t('theme_editor.preview.features.title')}</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <PaletteIcon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 font-heading text-lg font-semibold">{t('theme_editor.preview.features.card_title', { number: item })}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t('theme_editor.preview.features.card_desc')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-secondary/10 px-6 py-16">
            <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
              <h3 className="mb-6 font-heading text-xl font-bold">{t('theme_editor.preview.contact.title')}</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('theme_editor.preview.contact.email_label')}</Label>
                  <Input placeholder={t('theme_editor.preview.contact.email_placeholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('theme_editor.preview.contact.message_label')}</Label>
                  <Textarea placeholder={t('theme_editor.preview.contact.message_placeholder')} className="h-24" />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded border border-primary bg-primary text-primary-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <Label className="font-normal text-muted-foreground">{t('theme_editor.preview.contact.newsletter')}</Label>
                </div>
                <Button className="w-full">{t('theme_editor.preview.contact.send_btn')}</Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ThemeEditorPreview;
