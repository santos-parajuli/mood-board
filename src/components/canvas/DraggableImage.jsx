'use client';

import { BringToFront, SendToBack, ShoppingCart, Trash2 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';

import Draggable from 'react-draggable';
import { useRef } from 'react';

export default function DraggableImage({ img, onStop, onDrag, onClick, isSelected, onBringToFront, onSendToBack, onDeleteImage, addToCart }) {
	const nodeRef = useRef(null);
	return (
		<Draggable nodeRef={nodeRef} position={{ x: img.x, y: img.y }} onStop={(e, ui) => onStop(e, ui, img.id)} onDrag={(e, ui) => onDrag(e, ui, img.id)}>
			<div
				ref={nodeRef}
				className={`absolute cursor-grab `}
				onClick={(e) => {
					e.stopPropagation();
					onClick(img.id);
				}}
				style={{ width: img.currentWidth, height: img.currentHeight }}>
				<ContextMenu>
					<ContextMenuTrigger
						className='w-full h-full'
						onClick={(e) => {
							e.stopPropagation();
							onClick(img.id);
						}}>
						{' '}
						<img
							src={img.isProcessing ? img.originalSrc : img.src} // Use originalSrc for processing overlay
							alt={img.alt}
							className={`w-full h-full object-cover ${isSelected ? 'border-2 border-blue-500' : ''}`}
						/>
						{img.isProcessing && (
							<div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
								<p className='text-white'>Processing...</p>
							</div>
						)}
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem onClick={() => onBringToFront(img.id)}>
							<BringToFront className='mr-2 h-4 w-4' /> Bring to Front
						</ContextMenuItem>
						<ContextMenuItem onClick={() => onSendToBack(img.id)}>
							<SendToBack className='mr-2 h-4 w-4' /> Send to Back
						</ContextMenuItem>
						{img.withInsertID && (
							<ContextMenuItem onClick={() => addToCart(img.withInsertID)}>
								<ShoppingCart className='mr-2 h-4 w-4' />
								Add to Cart (with insert)
							</ContextMenuItem>
						)}
						{img.withoutInsertID && (
							<ContextMenuItem onClick={() => addToCart(img.withoutInsertID)}>
								<ShoppingCart className='mr-2 h-4 w-4' />
								Add to Cart (without insert)
							</ContextMenuItem>
						)}
						<ContextMenuItem onClick={() => onDeleteImage(img.id)} className='text-red-500 focus:text-red-500'>
							<Trash2 className='mr-2 h-4 w-4' /> Delete
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</div>
		</Draggable>
	);
}
