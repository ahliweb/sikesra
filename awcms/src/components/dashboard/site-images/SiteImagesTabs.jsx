import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SITE_IMAGES_TABS } from '@/components/dashboard/site-images/constants';
import HeroImagesEditor from '@/components/dashboard/site-images/HeroImagesEditor';
import SectionImagesEditor from '@/components/dashboard/site-images/SectionImagesEditor';
import GalleryCollectionsEditor from '@/components/dashboard/site-images/GalleryCollectionsEditor';

function SiteImagesTabs({
  activeTab,
  setActiveTab,
  data,
  updateSection,
}) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-[400px] grid-cols-3">
        {SITE_IMAGES_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="hero" className="mt-6">
        <HeroImagesEditor
          data={data.hero || {}}
          onChange={(value) => updateSection('hero', value)}
        />
      </TabsContent>

      <TabsContent value="sections" className="mt-6">
        <SectionImagesEditor
          data={data.sections || {}}
          onChange={(value) => updateSection('sections', value)}
        />
      </TabsContent>

      <TabsContent value="gallery" className="mt-6">
        <GalleryCollectionsEditor
          data={data.collections || []}
          onChange={(value) => updateSection('collections', value)}
        />
      </TabsContent>
    </Tabs>
  );
}

export default SiteImagesTabs;
