#!/bin/bash
#
# Syncs agent skills and AGENTS.md into each template directory.
# Creates .claude/skills symlink and CLAUDE.md symlink for Claude Code compatibility.
#
# Usage: ./scripts/sync-template-skills.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$ROOT_DIR/skills"
TEMPLATES_DIR="$ROOT_DIR/templates"

# Skills to sync into templates
SKILLS=(
	"building-emdash-site"
	"creating-plugins"
	"emdash-cli"
)

sync_skills() {
	local template_dir="$1"
	local template_name="$(basename "$template_dir")"
	local agents_dir="$template_dir/.agents/skills"
	local claude_dir="$template_dir/.claude"

	echo "Syncing skills -> $template_name"

	for skill in "${SKILLS[@]}"; do
		local src="$SKILLS_DIR/$skill"
		local dest="$agents_dir/$skill"

		if [[ ! -d "$src" ]]; then
			echo "  Skipping: $skill (not found in skills/)"
			continue
		fi

		# Remove existing copy
		if [[ -d "$dest" ]]; then
			rm -rf "$dest"
		fi

		mkdir -p "$agents_dir"
		cp -r "$src" "$dest"
		echo "  Copied: $skill"
	done

	# Create .claude/skills symlink
	mkdir -p "$claude_dir"
	local symlink="$claude_dir/skills"
	if [[ -L "$symlink" ]]; then
		rm "$symlink"
	elif [[ -e "$symlink" ]]; then
		rm -rf "$symlink"
	fi
	ln -s ../.agents/skills "$symlink"
	echo "  Linked: .claude/skills -> ../.agents/skills"

	# Copy AGENTS.md from starter template (canonical source for standalone sites)
	local agents_md="$TEMPLATES_DIR/starter/AGENTS.md"
	if [[ -f "$agents_md" ]]; then
		cp "$agents_md" "$template_dir/AGENTS.md"
		# Create CLAUDE.md symlink
		local claude_md="$template_dir/CLAUDE.md"
		if [[ -L "$claude_md" ]]; then
			rm "$claude_md"
		elif [[ -f "$claude_md" ]]; then
			rm "$claude_md"
		fi
		ln -s AGENTS.md "$claude_md"
		echo "  Copied: AGENTS.md + CLAUDE.md symlink"
	fi
}

echo "Syncing agent skills to templates..."
echo ""

for template_dir in "$TEMPLATES_DIR"/*/; do
	# Skip if not a directory
	[[ -d "$template_dir" ]] || continue
	sync_skills "$template_dir"
	echo ""
done

echo "Done!"
