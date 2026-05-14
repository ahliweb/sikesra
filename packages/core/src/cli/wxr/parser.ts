/**
 * WordPress WXR (WordPress eXtended RSS) parser
 *
 * Uses SAX streaming parser to handle large export files efficiently.
 * WXR is an RSS extension containing WordPress content exports.
 *
 * @see https://developer.wordpress.org/plugins/data-storage/wp-xml-rpc/
 */

import type { Readable } from "node:stream";

import sax from "sax";

// Regex patterns for WXR parsing
const PHP_SERIALIZED_STRING_PATTERN = /s:\d+:"([^"]+)"/g;
const PHP_SERIALIZED_STRING_MATCH_PATTERN = /s:\d+:"([^"]+)"/;

/**
 * Parsed WordPress export data
 */
export interface WxrData {
	/** Site metadata */
	site: WxrSite;
	/** Posts (including custom post types) */
	posts: WxrPost[];
	/** Media attachments */
	attachments: WxrAttachment[];
	/** Categories */
	categories: WxrCategory[];
	/** Tags */
	tags: WxrTag[];
	/** Authors */
	authors: WxrAuthor[];
	/** All taxonomy terms (including custom taxonomies and nav_menu) */
	terms: WxrTerm[];
	/** Parsed navigation menus */
	navMenus: WxrNavMenu[];
}

export interface WxrSite {
	title?: string;
	link?: string;
	description?: string;
	language?: string;
	baseSiteUrl?: string;
	baseBlogUrl?: string;
}

export interface WxrPost {
	id?: number;
	title?: string;
	link?: string;
	pubDate?: string;
	creator?: string;
	guid?: string;
	description?: string;
	content?: string;
	excerpt?: string;
	postDate?: string;
	postDateGmt?: string;
	postModified?: string;
	postModifiedGmt?: string;
	commentStatus?: string;
	pingStatus?: string;
	status?: string;
	postType?: string;
	postName?: string;
	postPassword?: string;
	isSticky?: boolean;
	/** Parent post ID for hierarchical content (pages) */
	postParent?: number;
	/** Menu order for sorting */
	menuOrder?: number;
	categories: string[];
	tags: string[];
	/** Custom taxonomy assignments beyond categories/tags */
	customTaxonomies?: Map<string, string[]>;
	meta: Map<string, string>;
}

export interface WxrAttachment {
	id?: number;
	title?: string;
	url?: string;
	postDate?: string;
	meta: Map<string, string>;
}

export interface WxrCategory {
	id?: number;
	nicename?: string;
	name?: string;
	parent?: string;
	description?: string;
}

export interface WxrTag {
	id?: number;
	slug?: string;
	name?: string;
	description?: string;
}

/**
 * Generic taxonomy term (categories, tags, nav_menu, custom taxonomies)
 */
export interface WxrTerm {
	id: number;
	taxonomy: string; // 'category', 'post_tag', 'nav_menu', 'genre', etc.
	slug: string;
	name: string;
	parent?: string;
	description?: string;
}

/**
 * Navigation menu structure
 */
export interface WxrNavMenu {
	id: number;
	name: string; // Menu slug
	label: string; // Menu name
	items: WxrNavMenuItem[];
}

/**
 * Navigation menu item
 */
export interface WxrNavMenuItem {
	id: number;
	menuId: number;
	parentId?: number;
	sortOrder: number;
	type: "custom" | "post_type" | "taxonomy";
	objectType?: string; // 'page', 'post', 'category'
	objectId?: number;
	url?: string;
	title: string;
	target?: string;
	classes?: string;
}

export interface WxrAuthor {
	id?: number;
	login?: string;
	email?: string;
	displayName?: string;
	firstName?: string;
	lastName?: string;
}

/** Extract string value from a SAX attribute (handles both Tag and QualifiedTag) */
function attrStr(attr: string | { value: string } | undefined): string {
	if (typeof attr === "string") return attr;
	if (attr && typeof attr === "object" && "value" in attr) return attr.value;
	return "";
}

/** Type guard for complete WxrTerm (all required fields present) */
function isCompleteWxrTerm(term: Partial<WxrTerm>): term is WxrTerm {
	return (
		term.id !== undefined &&
		term.taxonomy !== undefined &&
		term.slug !== undefined &&
		term.name !== undefined
	);
}

/**
 * Parse a WordPress WXR export file
 */
export function parseWxr(stream: Readable): Promise<WxrData> {
	return new Promise((resolve, reject) => {
		const parser = sax.createStream(true, { trim: true });

		const data: WxrData = {
			site: {},
			posts: [],
			attachments: [],
			categories: [],
			tags: [],
			authors: [],
			terms: [],
			navMenus: [],
		};

		// Parser state
		let currentPath: string[] = [];
		let currentText = "";
		let currentItem: WxrPost | null = null;
		let currentAttachment: WxrAttachment | null = null;
		let currentCategory: WxrCategory | null = null;
		let currentTag: WxrTag | null = null;
		let currentAuthor: WxrAuthor | null = null;
		let currentTerm: Partial<WxrTerm> | null = null;
		let currentMetaKey = "";

		// Track nav_menu_item posts for post-processing
		const navMenuItemPosts: WxrPost[] = [];
		// Track menu term IDs by slug for linking items to menus
		const menuTermsBySlug = new Map<string, number>();

		parser.on("opentag", (node) => {
			const tagName = node.name.toLowerCase();
			currentPath.push(tagName);
			currentText = "";

			// Start new item
			if (tagName === "item") {
				currentItem = {
					categories: [],
					tags: [],
					customTaxonomies: new Map(),
					meta: new Map(),
				};
			} else if (tagName === "wp:category") {
				currentCategory = {};
			} else if (tagName === "wp:tag") {
				currentTag = {};
			} else if (tagName === "wp:author") {
				currentAuthor = {};
			} else if (tagName === "wp:term") {
				currentTerm = {};
			}

			// Handle category/tag/custom taxonomy assignment in items
			if (tagName === "category" && currentItem && node.attributes) {
				const domain = attrStr(node.attributes.domain);
				const nicename = attrStr(node.attributes.nicename);
				if (domain === "category" && nicename) {
					currentItem.categories.push(nicename);
				} else if (domain === "post_tag" && nicename) {
					currentItem.tags.push(nicename);
				} else if (domain && nicename && domain !== "category" && domain !== "post_tag") {
					// Custom taxonomy (including nav_menu)
					if (!currentItem.customTaxonomies) {
						currentItem.customTaxonomies = new Map();
					}
					const existing = currentItem.customTaxonomies.get(domain) || [];
					existing.push(nicename);
					currentItem.customTaxonomies.set(domain, existing);
				}
			}
		});

		parser.on("text", (text) => {
			currentText += text;
		});

		parser.on("cdata", (cdata) => {
			currentText += cdata;
		});

		parser.on("closetag", (tagName) => {
			const tag = tagName.toLowerCase();
			const text = currentText.trim();

			// Site-level metadata (in channel)
			if (currentPath.includes("channel") && !currentItem) {
				switch (tag) {
					case "title":
						if (!data.site.title) data.site.title = text;
						break;
					case "link":
						if (!data.site.link) data.site.link = text;
						break;
					case "description":
						if (!data.site.description) data.site.description = text;
						break;
					case "language":
						data.site.language = text;
						break;
					case "wp:base_site_url":
						data.site.baseSiteUrl = text;
						break;
					case "wp:base_blog_url":
						data.site.baseBlogUrl = text;
						break;
				}
			}

			// Item (post/page/attachment) parsing
			if (currentItem) {
				switch (tag) {
					case "title":
						currentItem.title = text;
						break;
					case "link":
						currentItem.link = text;
						break;
					case "pubdate":
						currentItem.pubDate = text;
						break;
					case "dc:creator":
						currentItem.creator = text;
						break;
					case "guid":
						currentItem.guid = text;
						break;
					case "description":
						currentItem.description = text;
						break;
					case "content:encoded":
						currentItem.content = text;
						break;
					case "excerpt:encoded":
						currentItem.excerpt = text;
						break;
					case "wp:post_id":
						currentItem.id = parseInt(text, 10);
						break;
					case "wp:post_date":
						currentItem.postDate = text;
						break;
					case "wp:post_date_gmt":
						currentItem.postDateGmt = text;
						break;
					case "wp:post_modified":
						currentItem.postModified = text;
						break;
					case "wp:post_modified_gmt":
						currentItem.postModifiedGmt = text;
						break;
					case "wp:comment_status":
						currentItem.commentStatus = text;
						break;
					case "wp:ping_status":
						currentItem.pingStatus = text;
						break;
					case "wp:status":
						currentItem.status = text;
						break;
					case "wp:post_type":
						currentItem.postType = text;
						break;
					case "wp:post_name":
						currentItem.postName = text;
						break;
					case "wp:post_parent":
						currentItem.postParent = parseInt(text, 10);
						break;
					case "wp:menu_order":
						currentItem.menuOrder = parseInt(text, 10);
						break;
					case "wp:post_password":
						currentItem.postPassword = text || undefined;
						break;
					case "wp:is_sticky":
						currentItem.isSticky = text === "1";
						break;
					case "wp:meta_key":
						currentMetaKey = text;
						break;
					case "wp:meta_value":
						if (currentMetaKey) {
							currentItem.meta.set(currentMetaKey, text);
							currentMetaKey = "";
						}
						break;
					case "wp:attachment_url":
						if (currentItem.postType === "attachment") {
							// This is actually an attachment
							currentAttachment = {
								id: currentItem.id,
								title: currentItem.title,
								url: text,
								postDate: currentItem.postDate,
								meta: currentItem.meta,
							};
						}
						break;
					case "item":
						// End of item - categorize and store
						if (currentAttachment) {
							data.attachments.push(currentAttachment);
							currentAttachment = null;
						} else if (currentItem.postType === "nav_menu_item") {
							// Track nav_menu_item posts for post-processing into menus
							navMenuItemPosts.push(currentItem);
							data.posts.push(currentItem);
						} else if (currentItem.postType !== "attachment") {
							// Store all non-attachment post types (posts, pages, custom post types)
							data.posts.push(currentItem);
						}
						currentItem = null;
						break;
				}
			}

			// Category parsing
			if (currentCategory) {
				switch (tag) {
					case "wp:term_id":
						currentCategory.id = parseInt(text, 10);
						break;
					case "wp:category_nicename":
						currentCategory.nicename = text;
						break;
					case "wp:cat_name":
						currentCategory.name = text;
						break;
					case "wp:category_parent":
						currentCategory.parent = text || undefined;
						break;
					case "wp:category_description":
						currentCategory.description = text || undefined;
						break;
					case "wp:category":
						if (currentCategory.name) {
							data.categories.push(currentCategory);
						}
						currentCategory = null;
						break;
				}
			}

			// Tag parsing
			if (currentTag) {
				switch (tag) {
					case "wp:term_id":
						currentTag.id = parseInt(text, 10);
						break;
					case "wp:tag_slug":
						currentTag.slug = text;
						break;
					case "wp:tag_name":
						currentTag.name = text;
						break;
					case "wp:tag_description":
						currentTag.description = text || undefined;
						break;
					case "wp:tag":
						if (currentTag.name) {
							data.tags.push(currentTag);
						}
						currentTag = null;
						break;
				}
			}

			// Author parsing
			if (currentAuthor) {
				switch (tag) {
					case "wp:author_id":
						currentAuthor.id = parseInt(text, 10);
						break;
					case "wp:author_login":
						currentAuthor.login = text;
						break;
					case "wp:author_email":
						currentAuthor.email = text;
						break;
					case "wp:author_display_name":
						currentAuthor.displayName = text;
						break;
					case "wp:author_first_name":
						currentAuthor.firstName = text;
						break;
					case "wp:author_last_name":
						currentAuthor.lastName = text;
						break;
					case "wp:author":
						if (currentAuthor.login) {
							data.authors.push(currentAuthor);
						}
						currentAuthor = null;
						break;
				}
			}

			// Generic term parsing (wp:term elements - custom taxonomies, nav_menu, etc.)
			if (currentTerm) {
				switch (tag) {
					case "wp:term_id":
						currentTerm.id = parseInt(text, 10);
						break;
					case "wp:term_taxonomy":
						currentTerm.taxonomy = text;
						break;
					case "wp:term_slug":
						currentTerm.slug = text;
						break;
					case "wp:term_name":
						currentTerm.name = text;
						break;
					case "wp:term_parent":
						currentTerm.parent = text || undefined;
						break;
					case "wp:term_description":
						currentTerm.description = text || undefined;
						break;
					case "wp:term":
						if (isCompleteWxrTerm(currentTerm)) {
							data.terms.push(currentTerm);
							// Track nav_menu terms for building menus
							if (currentTerm.taxonomy === "nav_menu") {
								menuTermsBySlug.set(currentTerm.slug, currentTerm.id);
							}
						}
						currentTerm = null;
						break;
				}
			}

			currentPath.pop();
			currentText = "";
		});

		parser.on("error", (err) => {
			reject(new Error(`XML parsing error: ${err.message}`));
		});

		parser.on("end", () => {
			// Post-process nav_menu_item posts into structured menus
			data.navMenus = buildNavMenus(navMenuItemPosts, menuTermsBySlug);
			resolve(data);
		});

		// Pipe the stream through the parser
		stream.pipe(parser);
	});
}

/**
 * Parse a WordPress WXR export from a string
 *
 * Uses the non-streaming SAX parser API for compatibility with
 * environments that don't have Node.js streams (e.g., Cloudflare Workers).
 */
export function parseWxrString(xml: string): Promise<WxrData> {
	return new Promise((resolve, reject) => {
		const parser = sax.parser(true, { trim: false, normalize: false });

		const data: WxrData = {
			site: {},
			posts: [],
			attachments: [],
			categories: [],
			tags: [],
			authors: [],
			terms: [],
			navMenus: [],
		};

		let currentPath: string[] = [];
		let currentText = "";
		let currentItem: WxrPost | null = null;
		let currentAttachment: WxrAttachment | null = null;
		let currentCategory: WxrCategory | null = null;
		let currentTag: WxrTag | null = null;
		let currentAuthor: WxrAuthor | null = null;
		let currentTerm: Partial<WxrTerm> | null = null;
		let currentMetaKey = "";

		// Track nav_menu_item posts for post-processing
		const navMenuItemPosts: WxrPost[] = [];
		// Track menu term IDs by slug for linking items to menus
		const menuTermsBySlug = new Map<string, number>();

		parser.onopentag = (node) => {
			const tag = node.name.toLowerCase();
			currentPath.push(tag);
			currentText = "";

			// Start new elements
			if (tag === "item") {
				currentItem = {
					categories: [],
					tags: [],
					customTaxonomies: new Map(),
					meta: new Map(),
				};
			} else if (tag === "wp:category") {
				currentCategory = {};
			} else if (tag === "wp:tag") {
				currentTag = {};
			} else if (tag === "wp:author") {
				currentAuthor = {};
			} else if (tag === "wp:term") {
				currentTerm = {};
			}

			// Handle category/tag/custom taxonomy assignment in items
			if (tag === "category" && currentItem && node.attributes) {
				const domain = attrStr(node.attributes.domain);
				const nicename = attrStr(node.attributes.nicename);
				if (domain === "category" && nicename) {
					currentItem.categories.push(nicename);
				} else if (domain === "post_tag" && nicename) {
					currentItem.tags.push(nicename);
				} else if (domain && nicename && domain !== "category" && domain !== "post_tag") {
					// Custom taxonomy (including nav_menu)
					if (!currentItem.customTaxonomies) {
						currentItem.customTaxonomies = new Map();
					}
					const existing = currentItem.customTaxonomies.get(domain) || [];
					existing.push(nicename);
					currentItem.customTaxonomies.set(domain, existing);
				}
			}
		};

		parser.ontext = (text) => {
			currentText += text;
		};

		parser.oncdata = (cdata) => {
			currentText += cdata;
		};

		parser.onclosetag = (tagName) => {
			const tag = tagName.toLowerCase();
			const text = currentText.trim();

			// Site metadata
			if (currentPath.length === 2 && currentPath[0] === "rss") {
				switch (tag) {
					case "title":
						data.site.title = text;
						break;
					case "link":
						data.site.link = text;
						break;
					case "description":
						data.site.description = text;
						break;
					case "language":
						data.site.language = text;
						break;
					case "wp:base_site_url":
						data.site.baseSiteUrl = text;
						break;
					case "wp:base_blog_url":
						data.site.baseBlogUrl = text;
						break;
				}
			}

			// Item (post/page/attachment) parsing
			if (currentItem) {
				switch (tag) {
					case "title":
						currentItem.title = text;
						break;
					case "link":
						currentItem.link = text;
						break;
					case "pubdate":
						currentItem.pubDate = text;
						break;
					case "dc:creator":
						currentItem.creator = text;
						break;
					case "guid":
						currentItem.guid = text;
						break;
					case "description":
						currentItem.description = text;
						break;
					case "content:encoded":
						currentItem.content = text;
						break;
					case "excerpt:encoded":
						currentItem.excerpt = text;
						break;
					case "wp:post_id":
						currentItem.id = parseInt(text, 10);
						break;
					case "wp:post_date":
						currentItem.postDate = text;
						break;
					case "wp:post_date_gmt":
						currentItem.postDateGmt = text;
						break;
					case "wp:post_modified":
						currentItem.postModified = text;
						break;
					case "wp:post_modified_gmt":
						currentItem.postModifiedGmt = text;
						break;
					case "wp:comment_status":
						currentItem.commentStatus = text;
						break;
					case "wp:ping_status":
						currentItem.pingStatus = text;
						break;
					case "wp:post_name":
						currentItem.postName = text;
						break;
					case "wp:status":
						currentItem.status = text;
						break;
					case "wp:post_parent":
						currentItem.postParent = parseInt(text, 10);
						break;
					case "wp:menu_order":
						currentItem.menuOrder = parseInt(text, 10);
						break;
					case "wp:post_type":
						currentItem.postType = text;
						// If it's an attachment, convert to attachment type
						if (text === "attachment") {
							currentAttachment = {
								id: currentItem.id,
								title: currentItem.title,
								url: currentItem.link,
								postDate: currentItem.postDate,
								meta: new Map(),
							};
						}
						break;
					case "wp:post_password":
						currentItem.postPassword = text || undefined;
						break;
					case "wp:is_sticky":
						currentItem.isSticky = text === "1";
						break;
					case "wp:attachment_url":
						if (currentAttachment) {
							currentAttachment.url = text;
						}
						break;
					case "wp:meta_key":
						currentMetaKey = text;
						break;
					case "wp:meta_value":
						if (currentMetaKey && currentItem.meta) {
							currentItem.meta.set(currentMetaKey, text);
						}
						break;
					case "item":
						// End of item - categorize and store
						if (currentAttachment) {
							data.attachments.push(currentAttachment);
							currentAttachment = null;
						} else if (currentItem.postType === "nav_menu_item") {
							// Track nav_menu_item posts for post-processing into menus
							navMenuItemPosts.push(currentItem);
							data.posts.push(currentItem);
						} else if (currentItem.postType !== "attachment") {
							data.posts.push(currentItem);
						}
						currentItem = null;
						break;
				}
			}

			// Category parsing
			if (currentCategory) {
				switch (tag) {
					case "wp:term_id":
						currentCategory.id = parseInt(text, 10);
						break;
					case "wp:category_nicename":
						currentCategory.nicename = text;
						break;
					case "wp:cat_name":
						currentCategory.name = text;
						break;
					case "wp:category_parent":
						currentCategory.parent = text || undefined;
						break;
					case "wp:category_description":
						currentCategory.description = text || undefined;
						break;
					case "wp:category":
						if (currentCategory.name) {
							data.categories.push(currentCategory);
						}
						currentCategory = null;
						break;
				}
			}

			// Tag parsing
			if (currentTag) {
				switch (tag) {
					case "wp:term_id":
						currentTag.id = parseInt(text, 10);
						break;
					case "wp:tag_slug":
						currentTag.slug = text;
						break;
					case "wp:tag_name":
						currentTag.name = text;
						break;
					case "wp:tag_description":
						currentTag.description = text || undefined;
						break;
					case "wp:tag":
						if (currentTag.name) {
							data.tags.push(currentTag);
						}
						currentTag = null;
						break;
				}
			}

			// Author parsing
			if (currentAuthor) {
				switch (tag) {
					case "wp:author_id":
						currentAuthor.id = parseInt(text, 10);
						break;
					case "wp:author_login":
						currentAuthor.login = text;
						break;
					case "wp:author_email":
						currentAuthor.email = text;
						break;
					case "wp:author_display_name":
						currentAuthor.displayName = text;
						break;
					case "wp:author_first_name":
						currentAuthor.firstName = text;
						break;
					case "wp:author_last_name":
						currentAuthor.lastName = text;
						break;
					case "wp:author":
						if (currentAuthor.login) {
							data.authors.push(currentAuthor);
						}
						currentAuthor = null;
						break;
				}
			}

			// Generic term parsing (wp:term elements - custom taxonomies, nav_menu, etc.)
			if (currentTerm) {
				switch (tag) {
					case "wp:term_id":
						currentTerm.id = parseInt(text, 10);
						break;
					case "wp:term_taxonomy":
						currentTerm.taxonomy = text;
						break;
					case "wp:term_slug":
						currentTerm.slug = text;
						break;
					case "wp:term_name":
						currentTerm.name = text;
						break;
					case "wp:term_parent":
						currentTerm.parent = text || undefined;
						break;
					case "wp:term_description":
						currentTerm.description = text || undefined;
						break;
					case "wp:term":
						if (isCompleteWxrTerm(currentTerm)) {
							data.terms.push(currentTerm);
							// Track nav_menu terms for building menus
							if (currentTerm.taxonomy === "nav_menu") {
								menuTermsBySlug.set(currentTerm.slug, currentTerm.id);
							}
						}
						currentTerm = null;
						break;
				}
			}

			currentPath.pop();
			currentText = "";
		};

		parser.onerror = (err) => {
			reject(new Error(`XML parsing error: ${err.message}`));
		};

		parser.onend = () => {
			// Post-process nav_menu_item posts into structured menus
			data.navMenus = buildNavMenus(navMenuItemPosts, menuTermsBySlug);
			resolve(data);
		};

		// Parse the string (non-streaming)
		parser.write(xml).close();
	});
}

/**
 * Build structured navigation menus from nav_menu_item posts
 */
function buildNavMenus(
	navMenuItemPosts: WxrPost[],
	menuTermsBySlug: Map<string, number>,
): WxrNavMenu[] {
	// Group menu items by menu slug
	const menuItemsByMenu = new Map<string, WxrPost[]>();

	for (const post of navMenuItemPosts) {
		// Get the nav_menu taxonomy assignment to find which menu this item belongs to
		const navMenuSlugs = post.customTaxonomies?.get("nav_menu");
		if (!navMenuSlugs || navMenuSlugs.length === 0) continue;

		const menuSlug = navMenuSlugs[0];
		if (!menuSlug) continue;

		const items = menuItemsByMenu.get(menuSlug) || [];
		items.push(post);
		menuItemsByMenu.set(menuSlug, items);
	}

	// Build structured menus
	const menus: WxrNavMenu[] = [];

	for (const [menuSlug, posts] of menuItemsByMenu) {
		const menuId = menuTermsBySlug.get(menuSlug) || 0;

		// Convert posts to menu items
		const items: WxrNavMenuItem[] = posts.map((post) => {
			const meta = post.meta;
			const menuItemTypeRaw = meta.get("_menu_item_type") || "custom";
			const menuItemType: WxrNavMenuItem["type"] =
				menuItemTypeRaw === "post_type" || menuItemTypeRaw === "taxonomy"
					? menuItemTypeRaw
					: "custom";
			const objectType = meta.get("_menu_item_object");
			const objectIdStr = meta.get("_menu_item_object_id");
			const url = meta.get("_menu_item_url");
			const parentIdStr = meta.get("_menu_item_menu_item_parent");
			const target = meta.get("_menu_item_target");
			const classesStr = meta.get("_menu_item_classes");

			// Parse classes (stored as serialized PHP array)
			let classes: string | undefined;
			if (classesStr) {
				// Simple extraction of class names from serialized PHP
				const matches = classesStr.match(PHP_SERIALIZED_STRING_PATTERN);
				if (matches) {
					classes = matches
						.map((m) => m.match(PHP_SERIALIZED_STRING_MATCH_PATTERN)?.[1])
						.filter(Boolean)
						.join(" ");
				}
			}

			return {
				id: post.id || 0,
				menuId,
				parentId: parentIdStr ? parseInt(parentIdStr, 10) || undefined : undefined,
				sortOrder: post.menuOrder || 0,
				type: menuItemType,
				objectType: objectType || undefined,
				objectId: objectIdStr ? parseInt(objectIdStr, 10) : undefined,
				url: url || undefined,
				title: post.title || "",
				target: target || undefined,
				classes: classes || undefined,
			};
		});

		// Sort items by menu_order
		items.sort((a, b) => a.sortOrder - b.sortOrder);

		// Find the menu name from the terms
		// For now, use the slug as both name and label; we could enhance this
		// by looking up the actual term name from data.terms
		menus.push({
			id: menuId,
			name: menuSlug,
			label: menuSlug, // Will be enhanced when we have term data
			items,
		});
	}

	return menus;
}
