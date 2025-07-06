import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import React, { useRef } from 'react';

import Draggable from 'react-draggable';

const DraggableImage = ({ img, onStop, onDrag, onClick, isSelected, onBringToFront, onSendToBack }) => {
	const nodeRef = useRef(null);

	return (
		<Draggable
			nodeRef={nodeRef}
			position={{ x: img.x, y: img.y }} // Use position instead of defaultPosition for controlled component
			onStop={(e, ui) => onStop(e, ui, img.id)}
			onDrag={(e, ui) => {
				console.log(`Dragging image ${img.id}: x=${ui.x}, y=${ui.y}`);
				onDrag(e, ui, img.id);
			}}
			bounds='parent'>
			<div
				ref={nodeRef}
				className={`cursor-move absolute p-1  rounded ${isSelected ? 'border-2 border-blue-300' : ''}`}
				style={{
					width: img.currentWidth,
					height: img.currentHeight,
				}}>
				<ContextMenu>
					<ContextMenuTrigger className='w-full h-full'>
						<div
							className='w-full h-full'
							onClick={(e) => {
								e.stopPropagation();
								onClick(img.id);
							}}>
							{img.src && <img src={img.src} alt={img.alt} className='w-full h-full object-cover' />}
						</div>
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem onClick={() => onBringToFront(img.id)}>Bring to Front</ContextMenuItem>
						<ContextMenuItem onClick={() => onSendToBack(img.id)}>Send to Back</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</div>
		</Draggable>
	);
};

export default DraggableImage;
