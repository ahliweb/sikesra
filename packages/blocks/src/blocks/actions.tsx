import { renderElement } from "../render-element.js";
import type { ActionsBlock, BlockInteraction } from "../types.js";

export function ActionsBlockComponent({
	block,
	onAction,
}: {
	block: ActionsBlock;
	onAction: (interaction: BlockInteraction) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{block.elements.map((el, i) => (
				<div key={el.action_id ?? i}>{renderElement(el, onAction)}</div>
			))}
		</div>
	);
}
