/**
 * Visual Builder Module Index
 * Exports all visual builder components
 */

export { default as VisualPageBuilder } from './VisualPageBuilder';
export { default as VisualPageRenderer } from './Renderer';
export { default as puckConfig } from './config';
export { default as TemplateSelector } from './TemplateSelector';
export { pageTemplates } from './templates';

// Block components
export { HeroBlock, HeroBlockFields } from './blocks/HeroBlock';
export { TextBlock, TextBlockFields } from './blocks/TextBlock';
export { ImageBlock, ImageBlockFields } from './blocks/ImageBlock';
export { ButtonBlock, ButtonBlockFields } from './blocks/ButtonBlock';
export { SpacerBlock, SpacerBlockFields } from './blocks/SpacerBlock';
export { GridBlock, GridBlockFields } from './blocks/GridBlock';
export { CardBlock, CardBlockFields } from './blocks/CardBlock';
export { FeatureBlock, FeatureBlockFields } from './blocks/FeatureBlock';
export { TestimonialBlock, TestimonialBlockFields } from './blocks/TestimonialBlock';
export { GalleryBlock, GalleryBlockFields } from './blocks/GalleryBlock';
export { ContactFormBlock, ContactFormBlockFields } from './blocks/ContactFormBlock';

// Custom Fields (Media Library integration)
export { ImageField, MultiImageField } from './fields/ImageField';

// Hooks
export { useHistory } from './hooks/useHistory';
