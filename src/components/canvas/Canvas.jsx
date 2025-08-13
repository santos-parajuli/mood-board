'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import DraggableImage from './DraggableImage';
import DraggableText from './DraggableText';
import useMoodboardStore from '../../store/moodboardStore';

const DEFAULT_INITIAL_CANVAS_IMAGE_SIZE = 100;
const PIXELS_PER_UNIT = 10;

const Canvas = forwardRef((props, ref) => {
	const { getMoodboardState, setMoodboardState, selectedItemIds, setSelectedItemIds, addSelectedItem, removeSelectedItem, toggleSelectedItem, clearSelectedItems, addCanvasImage, deleteCanvasItem, updateCanvasImage, updateCanvasText } =
		useMoodboardStore();
	const activeMoodboard = getMoodboardState();
	const canvasImages = activeMoodboard?.canvasImages || [];
	const canvasTexts = activeMoodboard?.canvasTexts || [];
	const canvasRef = useRef(null);
	const addImageToCanvas = async (item, dropPosition) => {
		let imageSrc = item.image || item.src;
		if (!imageSrc) {
			console.warn('Item has no image source.');
			return;
		}
		if (imageSrc.startsWith('//')) {
			imageSrc = 'https:' + imageSrc;
		}
		const img = new Image();
		img.src = imageSrc;
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});
		const originalWidth = img.naturalWidth;
		const originalHeight = img.naturalHeight;
		const extractDimensions = (title) => {
			const match = title.match(/(\d+)x(\d+)/i);
			if (match) {
				return { width: parseInt(match[2], 10), height: parseInt(match[1], 10) };
			}
			return null;
		};
		let initialWidth;
		let initialHeight;
		const dimensions = extractDimensions(item.title || item.alt);
		if (dimensions) {
			initialWidth = dimensions.width * PIXELS_PER_UNIT;
			initialHeight = dimensions.height * PIXELS_PER_UNIT;
		} else {
			initialWidth = DEFAULT_INITIAL_CANVAS_IMAGE_SIZE;
			initialHeight = (originalHeight / originalWidth) * DEFAULT_INITIAL_CANVAS_IMAGE_SIZE;
		}
		let x, y;
		if (dropPosition) {
			const canvasRect = canvasRef.current.getBoundingClientRect();
			x = dropPosition.x - canvasRect.left - initialWidth / 2;
			y = dropPosition.y - canvasRect.top - initialHeight / 2;
		} else {
			// Default position for double-click: top-right
			const canvasRect = canvasRef.current.getBoundingClientRect();
			x = canvasRect.width - initialWidth - 50; // 50px from right edge
			y = 50; // 50px from top edge
		}
		const newImage = {
			id: Date.now(),
			src: imageSrc,
			originalSrc: imageSrc, // Store original source
			alt: item.title || item.alt,
			x,
			y,
			originalWidth,
			originalHeight,
			baseWidth: initialWidth,
			baseHeight: initialHeight,
			currentWidth: initialWidth,
			currentHeight: initialHeight,
			pillowUrl: item.url,
			withInsertID: item.withInsertID,
			withoutInsertID: item.withoutInsertID,
		};
		addCanvasImage(newImage);
		setSelectedItemIds([newImage.id]);
		handleRemoveBackground(newImage.id, newImage.src);
	};
	useImperativeHandle(ref, () => ({
		addImageToCanvas,
		handleRemoveBackground,
	}));

	const handleCanvasItemClick = (e, id) => {
		e.stopPropagation();
		if (e.shiftKey || e.metaKey || e.ctrlKey) {
			toggleSelectedItem(id);
		} else {
			setSelectedItemIds([id]);
		}
	};
	const handleCanvasClick = () => {
		clearSelectedItems();
	};
	const handleDrag = (e, ui, id) => {
		const isMultiSelectActive = e.shiftKey || e.ctrlKey || e.metaKey;
		const isDraggingUnselected = !selectedItemIds.includes(id);

		let newSelectedIds = [...selectedItemIds];

		if (isDraggingUnselected) {
			if (!isMultiSelectActive) {
				// Replace selection with dragged item
				newSelectedIds = [id];
			}
		}
		// Update selection **before moving**
		setSelectedItemIds(newSelectedIds);
		// Move all selected items
		newSelectedIds.forEach((selectedId) => {
			const img = canvasImages.find((img) => img.id === selectedId);
			const txt = canvasTexts.find((txt) => txt.id === selectedId);

			if (!img && !txt) return;

			// Only calculate delta relative to the item being dragged
			const baseX = img?.x || txt?.x || 0;
			const baseY = img?.y || txt?.y || 0;
			const deltaX = selectedId === id ? ui.x - baseX : ui.x - (canvasImages.find((i) => i.id === id)?.x || canvasTexts.find((t) => t.id === id)?.x || 0);
			const deltaY = selectedId === id ? ui.y - baseY : ui.y - (canvasImages.find((i) => i.id === id)?.y || canvasTexts.find((t) => t.id === id)?.y || 0);

			if (img) updateCanvasImage(selectedId, { x: baseX + deltaX, y: baseY + deltaY });
			if (txt) updateCanvasText(selectedId, { x: baseX + deltaX, y: baseY + deltaY });
		});
	};

	const handleDragStop = (e, ui, id) => {
		handleDrag(e, ui, id);
	};
	const handleResizeStop = (id, newWidth, newHeight) => {
		updateCanvasImage(id, { currentWidth: newWidth, currentHeight: newHeight, baseWidth: newWidth, baseHeight: newHeight });
	};
	const handleImageDrop = (e) => {
		e.preventDefault();
		const sourceType = e.dataTransfer.getData('source/type');
		if (sourceType !== 'gallery') return;
		const item = {
			image: e.dataTransfer.getData('image/src'),
			title: e.dataTransfer.getData('image/alt'),
			withInsertID: e.dataTransfer.getData('withInsertID'),
			withoutInsertID: e.dataTransfer.getData('withoutInsertID'),
			url: e.dataTransfer.getData('pillowUrl'),
		};
		addImageToCanvas(item, { x: e.clientX, y: e.clientY });
	};

	const addToCart = (id) => {
		const cartUrl = `https://www.tonicliving.ca/cart/add?id=${id}&quantity=1`;
		const newTab = window.open(cartUrl, '_blank', 'noopener');
		if (newTab) {
			setTimeout(() => {
				newTab.close();
			}, 1500); // 1.5s to allow cart cookies to set
		} else {
			console.error('Failed to open tab (popup blocker?)');
		}
	};
	const bringToFront = (id) => {
		const activeMoodboard = getMoodboardState();
		if (!activeMoodboard) return;
		const imageToMove = activeMoodboard.canvasImages.find((img) => img.id === id);
		if (!imageToMove) return;
		const filteredImages = activeMoodboard.canvasImages.filter((img) => img.id !== id);
		setMoodboardState({ canvasImages: [...filteredImages, imageToMove] });
	};
	const sendToBack = (id) => {
		const activeMoodboard = getMoodboardState();
		if (!activeMoodboard) return;
		const imageToMove = activeMoodboard.canvasImages.find((img) => img.id === id);
		if (!imageToMove) return;
		const filteredImages = activeMoodboard.canvasImages.filter((img) => img.id !== id);
		setMoodboardState({ canvasImages: [imageToMove, ...filteredImages] });
	};
	const handleRemoveBackground = async (id, src) => {
		updateCanvasImage(id, { isProcessing: true });
		// /api/removebg original;
		try {
			const response = await fetch('/api/removebg', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ imageUrl: src }),
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.onloadend = () => {
				const base64data = reader.result;
				updateCanvasImage(id, { src: url, dataUrl: base64data, isProcessing: false });
			};
		} catch (error) {
			console.error('Failed to remove background:', error);
			updateCanvasImage(id, { isProcessing: false });
		}
	};
	useEffect(() => {
		if (selectedItemIds.length > 0 && canvasRef.current) {
			canvasRef.current.focus();
		}
	}, [selectedItemIds]);
	useEffect(() => {
		const MOVE_AMOUNT = 5;
		const SMALL_MOVE_AMOUNT = 1;
		const handleKeyDown = (e) => {
			if (!selectedItemIds || selectedItemIds.length === 0) return;
			const activeEl = document.activeElement;
			const isEditingText = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
			// If editing a text input, let it handle keys
			if (isEditingText) return;
			// Handle Delete/Backspace for both images and text
			console.log(selectedItemIds);
			if (e.key === 'Delete' || e.key === 'Backspace') {
				e.preventDefault();
				if (selectedItemIds.length === 1 && typeof selectedItemIds[0] === 'string' && !e.shiftKey) {
					return;
				}
				selectedItemIds.forEach((id) => {
					deleteCanvasItem(id);
				});
				clearSelectedItems();
				return;
			}
			// Handle Cmd/Ctrl + B, =, - for text items
			if (e.metaKey || e.ctrlKey) {
				selectedItemIds.forEach((id) => {
					const isText = typeof id === 'string' && id.startsWith('text-');
					if (isText) {
						e.preventDefault();
						if (e.key === 'b') {
							updateCanvasText(id, { fontWeight: canvasTexts.find((text) => text.id === id).fontWeight === 'bold' ? 'normal' : 'bold' });
						} else if (e.key === '=' || e.key === '+') {
							updateCanvasText(id, { fontSize: canvasTexts.find((text) => text.id === id).fontSize + 2 });
						} else if (e.key === '-' || e.key === '_') {
							updateCanvasText(id, { fontSize: Math.max(8, canvasTexts.find((text) => text.id === id).fontSize - 2) });
						}
					}
				});
				return;
			}
			const moveBy = e.shiftKey ? SMALL_MOVE_AMOUNT : MOVE_AMOUNT;
			const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
			if (isArrowKey) {
				e.preventDefault();
				selectedItemIds.forEach((id) => {
					const img = canvasImages.find((img) => img.id === id);
					if (img) {
						let newX = img.x;
						let newY = img.y;
						if (e.key === 'ArrowUp') newY -= moveBy;
						if (e.key === 'ArrowDown') newY += moveBy;
						if (e.key === 'ArrowLeft') newX -= moveBy;
						if (e.key === 'ArrowRight') newX += moveBy;
						updateCanvasImage(id, { x: newX, y: newY });
					}
					const txt = canvasTexts.find((txt) => txt.id === id);
					if (txt) {
						let newX = txt.x;
						let newY = txt.y;
						if (e.key === 'ArrowUp') newY -= moveBy;
						if (e.key === 'ArrowDown') newY += moveBy;
						if (e.key === 'ArrowLeft') newX -= moveBy;
						if (e.key === 'ArrowRight') newX += moveBy;
						updateCanvasText(id, { x: newX, y: newY });
					}
				});
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedItemIds, canvasImages, canvasTexts, deleteCanvasItem, updateCanvasImage, updateCanvasText]);
	const handleDeleteItem = (id) => {
		deleteCanvasItem(id);
		clearSelectedItems();
	};
	const handleUpdateText = (id, newProps) => {
		updateCanvasText(id, newProps);
	};
	return (
		<div
			ref={canvasRef}
			id='canvasDiv'
			className='flex-grow h-full border-2 border-dashed border-gray-400 rounded-lg relative overflow-hidden'
			onDrop={handleImageDrop}
			onDragOver={(e) => e.preventDefault()}
			onClick={handleCanvasClick}
			tabIndex={0}>
			{canvasImages.length === 0 && canvasTexts.length === 0 && <div className='flex items-center justify-center h-full text-gray-400'>Drop images here</div>}
			{canvasImages.map((img) => (
				<DraggableImage
					key={img.id}
					img={img}
					onStop={handleDragStop}
					onDrag={handleDrag}
					onClick={handleCanvasItemClick}
					isSelected={selectedItemIds.includes(img.id)}
					onBringToFront={bringToFront}
					onSendToBack={sendToBack}
					onDeleteItem={handleDeleteItem}
					withInsertID={img.withInsertID}
					withoutInsertID={img.withoutInsertID}
					addToCart={addToCart}
					onResizeStop={handleResizeStop}
				/>
			))}
			{Array.isArray(canvasTexts) &&
				canvasTexts.map((text) => (
					<DraggableText key={text.id} text={text} onStop={handleDragStop} onDrag={handleDrag} onClick={handleCanvasItemClick} isSelected={selectedItemIds.includes(text.id)} onUpdateText={handleUpdateText} onDeleteItem={handleDeleteItem} />
				))}
		</div>
	);
});

export default Canvas;
