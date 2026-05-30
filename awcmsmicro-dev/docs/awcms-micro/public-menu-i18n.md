# Public Menu & i18n Integration

This document explains how AWCMS-Micro public templates render localized, nested navigation menus using official EmDash APIs.

## Official EmDash Menu Queries

AWCMS-Micro templates must not invent a custom public menu schema or storage layer. Instead, they must rely on the native EmDash menu system and query it using the official `getMenu` API.

### Basic Localized Query

To retrieve a menu filtered and resolved for the visitor's active locale (e.g., matching the current URL subfolder), pass the `Astro.currentLocale` option:

```astro
---
import { getMenu } from "emdash";

// Retrieve the 'primary' menu matching Astro's active locale context
const menu = await getMenu("primary", { locale: Astro.currentLocale });
---
```

## Nested & Recursive Child Menus

EmDash menus support a tree-like hierarchy through the `children` array on menu items. The public navigation component (`PublicNavigation.astro`) renders these recursively:

```astro
---
// PublicNavigationItem.astro
import type { MenuItem } from "emdash";

interface Props {
  item: MenuItem;
  currentPath: string;
  level: number;
}

const { item, currentPath, level } = Astro.props;
const hasChildren = item.children.length > 0;
---

<li class="nav-item">
  <a href={item.url}>{item.label}</a>

  {hasChildren && (
    <ul class="submenu">
      {item.children.map((child) => (
        <Astro.self item={child} currentPath={currentPath} level={level + 1} />
      ))}
    </ul>
  )}
</li>
```

## Language Switching (`LanguageSwitcher.astro`)

The template includes a public `<LanguageSwitcher />` component. It translates the visitor's current location to the alternative language.

### Translation-Group Resolution

For dynamic pages (e.g. blog posts or landing pages), the switcher queries `getTranslations` using the current entry's collection and database ID to find the slug matching the target locale:

```ts
import { getTranslations } from "emdash";

const { translations } = await getTranslations("posts", post.data.id);
// Returns: [{ locale: "en", slug: "hello-world" }, { locale: "id", slug: "halo-dunia" }]
```

If a translation exists, the visitor is redirected to the localized route. If no translation exists, they safely fall back to that language's home page (e.g., `/id/` or `/`).
