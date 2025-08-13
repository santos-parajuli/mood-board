'use client';

import 'react-resizable/css/styles.css';

import { BringToFront, Maximize, SendToBack, ShoppingCart, Trash2 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import React, { useRef, useState } from 'react';

import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Skeleton } from '../ui/skeleton';

export default function DraggableImage({ img, onStop, onDrag, onClick, isSelected, onBringToFront, onSendToBack, onDeleteItem, addToCart, onResizeStop }) {
	const nodeRef = useRef(null);
	const [isResizing, setIsResizing] = useState(false);

	const handleResizeStop = (e, data) => {
		onResizeStop(img.id, data.size.width, data.size.height);
		setIsResizing(false);
	};

	return (
		<Draggable nodeRef={nodeRef} disabled={isResizing} position={{ x: img.x, y: img.y }} onStop={(e, ui) => onStop(e, ui, img.id)} onDrag={(e, ui) => onDrag(e, ui, img.id)} bounds='parent'>
			<div
				ref={nodeRef}
				className={`absolute cursor-grab ${isSelected ? 'border-2 border-blue-300' : ''}`}
				style={{
					width: img.currentWidth,
					height: img.currentHeight,
				}}>
				{isResizing ? (
					<ResizableBox width={img.currentWidth} height={img.currentHeight} minConstraints={[50, 50]} maxConstraints={[500, 500]} lockAspectRatio={true} onResizeStop={handleResizeStop} className='w-full h-full p-2'>
						<img src={img.isProcessing ? img.originalSrc : img.src} alt={img.alt} className='w-full h-full object-cover' />
						{img.isProcessing && (
							<div className='absolute inset-0 flex items-center justify-center'>
								<Skeleton className='h-full w-full rounded-xl' />
							</div>
						)}
					</ResizableBox>
				) : (
					<div className='w-full h-full' onClick={(e) => onClick(e, img.id)}>
						<ContextMenu>
							<ContextMenuTrigger className='w-full h-full' onClick={(e) => onClick(e, img.id)}>
								<img src={img.isProcessing ? img.originalSrc : img.src} alt={img.alt} className={`w-full h-full object-cover ${isSelected ? 'border-2 border-blue-500' : ''}`} />
								{img.isProcessing && (
									<div className='absolute inset-0 flex items-center justify-center'>
										<Skeleton className='h-full w-full rounded-xl' />
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
								<ContextMenuItem onClick={() => setIsResizing(true)}>
									<Maximize className='mr-2 h-4 w-4' /> Resize
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onDeleteItem(img.id)} className='text-red-500 focus:text-red-500'>
									<Trash2 className='mr-2 h-4 w-4' /> Delete
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu>
					</div>
				)}
			</div>
		</Draggable>
	);
}
