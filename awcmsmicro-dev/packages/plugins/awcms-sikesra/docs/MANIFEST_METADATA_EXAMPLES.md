# Manifest Metadata Examples

Use these snippets when you are ready to add `repo` and `security` to `emdash-plugin.jsonc`.

## Internal GitHub Repository

```jsonc
"repo": {
	"url": "https://github.com/your-org/your-plugin-repo",
	"directory": "."
},
"security": {
	"url": "https://github.com/your-org/your-plugin-repo/security"
}
```

Use this when the plugin lives in its own GitHub repository.

## Monorepo Subdirectory

```jsonc
"repo": {
	"url": "https://github.com/your-org/your-monorepo",
	"directory": "packages/plugins/your-plugin"
},
"security": {
	"url": "https://github.com/your-org/your-monorepo/security"
}
```

Use this when the plugin is published from a subdirectory inside a larger repository.

## Self-Hosted Git Service

```jsonc
"repo": {
	"url": "https://git.example.com/platform/your-plugin",
	"directory": "."
},
"security": {
	"url": "https://git.example.com/platform/your-plugin/security"
}
```

Use this when source and advisory workflow live on your own Git service.

## Internal Security Portal

```jsonc
"repo": {
	"url": "https://github.com/your-org/your-plugin-repo",
	"directory": "."
},
"security": {
	"url": "https://security.example.com/products/your-plugin"
}
```

Use this when the code is in Git, but security reporting is routed through a central internal portal.

## AWCMS SIKESRA Naming Pattern

```jsonc
"repo": {
	"url": "https://github.com/your-org/awcms-sikesra-plugin",
	"directory": "."
},
"security": {
	"url": "https://security.example.com/products/awcms-sikesra-plugin"
}
```

Use this when you want your published metadata to follow the checked-in SIKESRA package naming directly.
