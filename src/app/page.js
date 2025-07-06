'use client';

import { useEffect, useRef, useState } from 'react';

import DraggableImage from '../components/DraggableImage';
import { ScrollArea } from '@/components/ui/scroll-area';

const DEFAULT_INITIAL_CANVAS_IMAGE_SIZE = 100;
const PIXELS_PER_UNIT = 10;

export default function Home() {
	const [url, setUrl] = useState('https://www.tonicliving.ca/products/kalida-22x22-pillow-walnut');
	const [zoomLevel, setZoomLevel] = useState(1.0);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [canvasImages, setCanvasImages] = useState([]);
	const [selectedImageId, setSelectedImageId] = useState(null);
	const canvasRef = useRef(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			const response = await fetch('/api/scrape', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ url }),
			});
			const result = await response.json();
			if (response.ok) {
				setData((prevData) => {
					const { mainProduct } = result;

					const uniqueBy = (arr, key) => {
						const seen = new Set();
						return arr.filter((item) => {
							const k = item[key] || item.title;
							if (!k || seen.has(k)) return false;
							seen.add(k);
							return true;
						});
					};

					if (!prevData) {
						return {
							mainProducts: [mainProduct],
							goesWellWith: mainProduct.goesWellWith || [],
							youMayAlsoLike: mainProduct.youMayAlsoLike || [],
							error: null,
						};
					}

					const newMainProducts = [...prevData.mainProducts, mainProduct];
					const newGoesWellWith = [...prevData.goesWellWith, ...(mainProduct.goesWellWith || [])];
					const newYouMayAlsoLike = [...prevData.youMayAlsoLike, ...(mainProduct.youMayAlsoLike || [])];

					return {
						mainProducts: uniqueBy(newMainProducts, 'url'),
						goesWellWith: uniqueBy(newGoesWellWith, 'url'),
						youMayAlsoLike: uniqueBy(newYouMayAlsoLike, 'url'),
						error: null,
					};
				});
			} else {
				console.log(result.error);
				setData((prevData) => ({ ...prevData, error: result.error }));
			}
		} catch (error) {
			console.error('Error scraping:', error);
			setData((prevData) => ({ ...prevData, error: 'Failed to scrape.' }));
		}
		setLoading(false);
	};

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
			x = 50; // Default position for double-click
			y = 50;
		}

		const newImage = {
			id: Date.now(),
			src: imageSrc,
			alt: item.title || item.alt,
			x,
			y,
			originalWidth,
			originalHeight,
			baseWidth: initialWidth,
			baseHeight: initialHeight,
			currentWidth: initialWidth * zoomLevel,
			currentHeight: initialHeight * zoomLevel,
		};

		setCanvasImages((prevImages) => [...prevImages, newImage]);
		setSelectedImageId(newImage.id);
		handleRemoveBackground(newImage.id, newImage.src);
	};

	const handleDragStop = (e, ui, id) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, x: ui.x, y: ui.y } : img)));
	};

	const handleDrag = (e, ui, id) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, x: ui.x, y: ui.y } : img)));
	};

	const handleDoubleClick = (item) => {
		addImageToCanvas(item);
	};

	const handleDelete = (url) => {
		setData((prevData) => {
			const productToDelete = prevData.mainProducts.find((p) => p.url === url);
			if (!productToDelete) return prevData;

			const newMainProducts = prevData.mainProducts.filter((p) => p.url !== url);

			const urlsToFilter = [...(productToDelete.goesWellWith || []).map((p) => p.url), ...(productToDelete.youMayAlsoLike || []).map((p) => p.url)];

			const newGoesWellWith = prevData.goesWellWith.filter((p) => !urlsToFilter.includes(p.url));
			const newYouMayAlsoLike = prevData.youMayAlsoLike.filter((p) => !urlsToFilter.includes(p.url));

			return {
				...prevData,
				mainProducts: newMainProducts,
				goesWellWith: newGoesWellWith,
				youMayAlsoLike: newYouMayAlsoLike,
			};
		});
	};

	const handleImageDrop = (e) => {
		e.preventDefault();
		const sourceType = e.dataTransfer.getData('source/type');
		if (sourceType !== 'gallery') return;

		const item = {
			image: e.dataTransfer.getData('image/src'),
			title: e.dataTransfer.getData('image/alt'),
		};

		addImageToCanvas(item, { x: e.clientX, y: e.clientY });
	};

	const handleDragStart = (e, item) => {
		e.dataTransfer.setData('image/src', item.image);
		e.dataTransfer.setData('image/alt', item.title);
		e.dataTransfer.setData('source/type', 'gallery');
	};

	const handleCanvasImageClick = (id) => {
		setSelectedImageId((prevSelectedId) => (prevSelectedId === id ? null : id));
	};

	const handleCanvasClick = () => {
		setSelectedImageId(null);
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

			setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, src: url, isProcessing: false } : img)));
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
		setCanvasImages((prevImages) =>
			prevImages.map((img) => ({
				...img,
				currentWidth: img.baseWidth * zoomLevel,
				currentHeight: img.baseHeight * zoomLevel,
			}))
		);
	}, [zoomLevel]);

	useEffect(() => {
		return () => {
			canvasImages.forEach((img) => {
				if (img.src.startsWith('blob:')) {
					URL.revokeObjectURL(img.src);
				}
			});
		};
	}, [canvasImages]);

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
	}, [selectedImageId]);

	return (
		<main className='flex flex-col h-screen w-full'>
			<div className='p-4 border-b'>
				<div className='flex items-center justify-between'>
					<h1 className='text-2xl font-bold'>Mood Board</h1>
					{canvasImages.length >= 1 && (
						<div className='w-1/3'>
							<label htmlFor='zoom-slider' className='block text-gray-700 text-sm font-bold mb-2'>
								Zoom: {Math.round(zoomLevel * 100)}%
							</label>
							<input type='range' id='zoom-slider' min='0.5' max='2.0' step='0.05' value={zoomLevel} onChange={(e) => setZoomLevel(parseFloat(e.target.value))} className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer' />
						</div>
					)}
				</div>
				<form onSubmit={handleSubmit} className='w-full mt-4'>
					<div className='flex items-center'>
						<input className='appearance-none bg-transparent border-b w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none' type='text' placeholder='Enter URL' value={url} onChange={(e) => setUrl(e.target.value)} />
						<button className='flex-shrink-0 bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-sm border-4 text-white py-1 px-2 rounded' type='submit' disabled={loading}>
							{loading ? 'Scraping...' : 'Scrape'}
						</button>
					</div>
				</form>
			</div>

			<div className='flex flex-grow overflow-hidden'>
				{data && (
					<div className='w-1/4 border-r'>
						<ScrollArea className='h-full w-full p-4'>
							<h2 className='text-xl font-bold mb-4'>Scraped Images</h2>
							{data.error ? (
								<p className='text-red-500'>{data.error}</p>
							) : (
								<div>
									<h3 className='text-lg font-bold mb-2'>Main Products</h3>
									{data.mainProducts &&
										data.mainProducts.map((item, index) => (
											<div onDoubleClick={() => handleDoubleClick(item)} key={index} draggable onDragStart={(e) => handleDragStart(e, item)} className='relative group flex items-center p-2 border-b cursor-grab'>
												<img src={item.image} alt={item.title} className='w-16 h-16 object-contain mr-4' />
												<p className='text-sm'>{item.title}</p>
												<button onClick={() => handleDelete(item.url)} className='absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity'>
													X
												</button>
											</div>
										))}
									<h3 className='text-lg font-bold mt-4 mb-2'>Goes Well With</h3>
									{data.goesWellWith &&
										data.goesWellWith.map((item, index) => (
											<div onDoubleClick={() => handleDoubleClick(item)} key={index} draggable onDragStart={(e) => handleDragStart(e, item)} className='flex items-center p-2 border-b cursor-grab'>
												<img src={item.image} alt={item.title} className='w-16 h-16 object-contain mr-4' />
												<p className='text-sm'>{item.title}</p>
											</div>
										))}
									<h3 className='text-lg font-bold mt-4 mb-2'>You May Also Like</h3>
									{data.youMayAlsoLike &&
										data.youMayAlsoLike.map((item, index) => (
											<div onDoubleClick={() => handleDoubleClick(item)} key={index} draggable onDragStart={(e) => handleDragStart(e, item)} className='flex items-center p-2 border-b cursor-grab'>
												<img src={item.image} alt={item.title} className='w-16 h-16 object-contain mr-4' />
												<p className='text-sm'>{item.title}</p>
											</div>
										))}
								</div>
							)}
						</ScrollArea>
					</div>
				)}

				<div ref={canvasRef} className='flex-grow h-full border-2 border-dashed border-gray-400 rounded-lg relative overflow-hidden' onDrop={handleImageDrop} onDragOver={(e) => e.preventDefault()} onClick={handleCanvasClick} tabIndex={0}>
					{canvasImages.length === 0 && <div className='flex items-center justify-center h-full text-gray-400'>Drop images here</div>}
					{canvasImages.map((img) => (
						<DraggableImage key={img.id} img={img} onStop={handleDragStop} onDrag={handleDrag} onClick={handleCanvasImageClick} isSelected={img.id === selectedImageId} onBringToFront={bringToFront} onSendToBack={sendToBack} onRemoveBackground={handleRemoveBackground} />
					))}
				</div>
			</div>
		</main>
	);
}