'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import DraggableImage from './DraggableImage';

const DEFAULT_INITIAL_CANVAS_IMAGE_SIZE = 100;
const PIXELS_PER_UNIT = 10;

const Canvas = forwardRef(({ canvasImages, setCanvasImages, selectedImageId, setSelectedImageId, zoomLevel }, ref) => {
	const canvasRef = useRef(null);
	const addImageToCanvas = async (item, dropPosition) => {
		console.log(item);
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
			x = 50; // Default position for double-click
			y = 50;
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
			currentWidth: initialWidth * zoomLevel,
			currentHeight: initialHeight * zoomLevel,
			pillowUrl: item.url,
			withInsertID: item.withInsertID,
			withoutInsertID: item.withoutInsertID,
		};

		setCanvasImages((prevImages) => [...prevImages, newImage]);
		setSelectedImageId(newImage.id);
		handleRemoveBackground(newImage.id, newImage.src);
	};

	useImperativeHandle(ref, () => ({
		addImageToCanvas,
	}));

	const handleDragStop = (e, ui, id) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, x: ui.x, y: ui.y } : img)));
	};

	const handleDrag = (e, ui, id) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, x: ui.x, y: ui.y } : img)));
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
	const handleCanvasImageClick = (id) => {
		setSelectedImageId(id);
	};
	const handleCanvasClick = () => {
		setSelectedImageId(null);
	};
	const addToCart = (id) => {
		console.log(`Adding variant ${id} to cart and updating session cookies…`);
		const cartUrl = `https://www.tonicliving.ca/cart/add?id=${id}&quantity=1`;
		const newTab = window.open(cartUrl, '_blank', 'noopener');
		console.log(newTab);
		if (newTab) {
			setTimeout(() => {
				newTab.close();
				console.log('Tab closed after setting cookies.');
			}, 1500); // 1.5s to allow cart cookies to set
		} else {
			console.error('Failed to open tab (popup blocker?)');
		}
	};

	const bringToFront = (id) => {
		setCanvasImages((prevImages) => {
			const imageToMove = prevImages.find((img) => img.id === id);
			if (!imageToMove) return prevImages;
			const filteredImages = prevImages.filter((img) => img.id !== id);
			return [...filteredImages, imageToMove];
		});
	};

	const sendToBack = (id) => {
		setCanvasImages((prevImages) => {
			const imageToMove = prevImages.find((img) => img.id === id);
			if (!imageToMove) return prevImages;
			const filteredImages = prevImages.filter((img) => img.id !== id);
			return [imageToMove, ...filteredImages];
		});
	};

	const handleRemoveBackground = async (id, src) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, isProcessing: true } : img)));

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
				setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, src: url, dataUrl: base64data, isProcessing: false } : img)));
			};
		} catch (error) {
			console.error('Failed to remove background:', error);
			setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, isProcessing: false } : img)));
		}
	};

	useEffect(() => {
		if (selectedImageId && canvasRef.current) {
			canvasRef.current.focus();
		}
	}, [selectedImageId]);

	useEffect(() => {
		const MOVE_AMOUNT = 5;
		const SMALL_MOVE_AMOUNT = 1;

		const handleKeyDown = (e) => {
			if (selectedImageId) {
				const moveBy = e.shiftKey ? SMALL_MOVE_AMOUNT : MOVE_AMOUNT;
				let updated = false;
				setCanvasImages((prevImages) => {
					const newImages = prevImages.map((img) => {
						if (img.id === selectedImageId) {
							let newX = img.x;
							let newY = img.y;

							switch (e.key) {
								case 'ArrowUp':
									newY -= moveBy;
									updated = true;
									break;
								case 'ArrowDown':
									newY += moveBy;
									updated = true;
									break;
								case 'ArrowLeft':
									newX -= moveBy;
									updated = true;
									break;
								case 'ArrowRight':
									newX += moveBy;
									updated = true;
									break;
								case 'Delete':
								case 'Backspace':
									updated = true;
									return null;
								default:
									return img;
							}
							return { ...img, x: newX, y: newY };
						}
						return img;
					});

					if (updated) {
						e.preventDefault();
						if (e.key === 'Delete' || e.key === 'Backspace') {
							setSelectedImageId(null);
						}
					}
					return newImages.filter(Boolean);
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedImageId, setCanvasImages, setSelectedImageId]);

	const handleDeleteImage = (id) => {
		setCanvasImages((prevImages) => prevImages.filter((img) => img.id !== id));
		setSelectedImageId(null);
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
			{canvasImages.length === 0 && <div className='flex items-center justify-center h-full text-gray-400'>Drop images here</div>}
			{canvasImages.map((img) => (
				<DraggableImage
					key={img.id}
					img={img}
					onStop={handleDragStop}
					onDrag={handleDrag}
					onClick={handleCanvasImageClick}
					isSelected={img.id === selectedImageId}
					onBringToFront={bringToFront}
					onSendToBack={sendToBack}
					onDeleteImage={handleDeleteImage}
					withInsertID={img.withInsertID}
					withoutInsertID={img.withoutInsertID}
					addToCart={addToCart}
				/>
			))}
		</div>
	);
});

export default Canvas;
