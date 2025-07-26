import { Bold, Minus, Plus, Trash2 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useRef, useState } from 'react';

import Draggable from 'react-draggable';

export default function DraggableText({ text, onStop, onDrag, onClick, isSelected, onUpdateText, onDeleteItem }) {
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState(text.text);
	const nodeRef = useRef(null);

	const handleDoubleClick = () => {
		setIsEditing(true);
	};

	const handleBlur = () => {
		setIsEditing(false);
		onUpdateText(text.id, { text: inputValue });
	};

	const handleChange = (e) => {
		setInputValue(e.target.value);
	};

	const toggleBold = () => {
		onUpdateText(text.id, { fontWeight: text.fontWeight === 'bold' ? 'normal' : 'bold' });
	};

	const increaseFontSize = () => {
		onUpdateText(text.id, { fontSize: text.fontSize + 2 });
	};

	const decreaseFontSize = () => {
		onUpdateText(text.id, { fontSize: Math.max(8, text.fontSize - 2) });
	};

	return (
		<Draggable nodeRef={nodeRef} position={{ x: text.x, y: text.y }} onStop={(e, ui) => onStop(e, ui, text.id)} onDrag={(e, ui) => onDrag(e, ui, text.id)}>
			<div
				ref={nodeRef}
				className={`absolute cursor-grab p-2 ${isSelected ? 'border-2 border-blue-500' : ''}`}
				onClick={(e) => {
					e.stopPropagation();
					onClick(text.id);
				}}
				onDoubleClick={handleDoubleClick}>
				<ContextMenu>
					<ContextMenuTrigger>
						{isEditing ? (
							<input
								type='text'
								value={inputValue}
								onChange={handleChange}
								onBlur={handleBlur}
								autoFocus
								className='bg-transparent border-none focus:outline-none'
								style={{ fontWeight: text.fontWeight, fontSize: `${text.fontSize}px` }}
							/>
						) : (
							<p style={{ fontWeight: text.fontWeight, fontSize: `${text.fontSize}px` }}>{text.text}</p>
						)}
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem onClick={toggleBold}>
							<Bold className='mr-2 h-4 w-4' /> Bold
						</ContextMenuItem>
						<ContextMenuItem onClick={increaseFontSize}>
							<Plus className='mr-2 h-4 w-4' /> Increase Font
						</ContextMenuItem>
						<ContextMenuItem onClick={decreaseFontSize}>
							<Minus className='mr-2 h-4 w-4' /> Decrease Font
						</ContextMenuItem>
						<ContextMenuItem onClick={() => onDeleteItem(text.id)} className='text-red-500 focus:text-red-500'>
							<Trash2 className='mr-2 h-4 w-4' /> Delete
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</div>
		</Draggable>
	);
}