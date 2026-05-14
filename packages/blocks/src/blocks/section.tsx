import { renderElement } from "../render-element.js";
import type { BlockInteraction, SectionBlock } from "../types.js";

export function SectionBlockComponent({
	block,
	onAction,
}: {
	block: SectionBlock;
	onAction: (interaction: BlockInteraction) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex-1 text-kumo-default">{block.text}</div>
			{block.accessory && (
				<div className="flex-shrink-0">{renderElement(block.accessory, onAction)}</div>
			)}
		</div>
	);
}
