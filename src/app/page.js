'use client';

import { useEffect, useRef, useState } from 'react';

import DraggableImage from '../components/DraggableImage';
// import { removeBackground } from '@imgly/background-removal';

const DEFAULT_INITIAL_CANVAS_IMAGE_SIZE = 100; // Define a default initial size for dropped images
const PIXELS_PER_UNIT = 10; // Define a scaling factor for dimensions

export default function Home() {
	const [url, setUrl] = useState('https://www.tonicliving.ca/products/kalida-22x22-pillow-walnut');
	const [zoomLevel, setZoomLevel] = useState(1.0); // New state for zoom level, default to 1.0 (100%)
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [canvasImages, setCanvasImages] = useState([]);
	const [selectedImageId, setSelectedImageId] = useState(null);
	const canvasRef = useRef(null); // Ref for the canvas element

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setData(null);
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
				setData(result);
			} else {
				console.log(result.error);
				setData({ error: result.error });
			}
		} catch (error) {
			console.error('Error scraping:', error);
			setData({ error: 'Failed to scrape.' });
		}
		setLoading(false);
	};

		const handleDragStop = (e, ui, id) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, x: ui.x, y: ui.y } : img)));
	};

	const handleDrag = (e, ui, id) => {
		setCanvasImages((prevImages) => prevImages.map((img) => (img.id === id ? { ...img, x: ui.x, y: ui.y } : img)));
	};

	const handleImageDrop = async (e) => {
		e.preventDefault();
		const sourceType = e.dataTransfer.getData('source/type');

		// Only process drops that originate from the gallery
		if (sourceType !== 'gallery') {
			return;
		}

		let imageSrc = e.dataTransfer.getData('image/src');
		// Ensure imageSrc is an absolute URL and not empty
		if (!imageSrc) {
			console.warn('Dropped image has no source.');
			return;
		}

		if (imageSrc.startsWith('//')) {
			imageSrc = 'https:' + imageSrc;
		} else if (!imageSrc.startsWith('http')) {
			// Assuming a base URL if it's a relative path without //
			imageSrc = 'https://www.tonicliving.ca' + imageSrc;
		}
		const imageAlt = e.dataTransfer.getData('image/alt');

		// Load image to get original dimensions
		const img = new Image();
		img.src = imageSrc;
		await new Promise((resolve) => {
			img.onload = resolve;
		});

		const originalWidth = img.naturalWidth;
		const originalHeight = img.naturalHeight;

		// Function to extract dimensions from title (e.g., "22x22")
		const extractDimensions = (title) => {
			const match = title.match(/(\d+)x(\d+)/i);
			if (match) {
				// Assuming format is HEIGHTxWIDTH
				return { width: parseInt(match[2], 10), height: parseInt(match[1], 10) };
			}
			return null;
		};

		let initialDroppedWidth;
		let initialDroppedHeight;

		const dimensions = extractDimensions(imageAlt);

		if (dimensions) {
			initialDroppedWidth = dimensions.width * PIXELS_PER_UNIT;
			initialDroppedHeight = dimensions.height * PIXELS_PER_UNIT;
		} else {
			// Fallback to default initial size if dimensions not found in title
			initialDroppedWidth = DEFAULT_INITIAL_CANVAS_IMAGE_SIZE;
			initialDroppedHeight = (originalHeight / originalWidth) * DEFAULT_INITIAL_CANVAS_IMAGE_SIZE;
		}

		// Ensure image doesn't exceed canvas width/height if it's too large initially
		if (canvasRef.current) {
			if (initialDroppedWidth > canvasRef.current.offsetWidth) {
				initialDroppedWidth = canvasRef.current.offsetWidth - 20; // Some padding
				initialDroppedHeight = (originalHeight / originalWidth) * initialDroppedWidth;
			}
			if (initialDroppedHeight > canvasRef.current.offsetHeight) {
				initialDroppedHeight = canvasRef.current.offsetHeight - 20; // Some padding
				initialDroppedWidth = (originalWidth / originalHeight) * initialDroppedHeight;
			}
		}

		// Calculate drop position relative to the canvas using canvasRef
		if (!canvasRef.current) return; // Safety check
		const canvasRect = canvasRef.current.getBoundingClientRect();
		const dropX = e.clientX - canvasRect.left;
		const dropY = e.clientY - canvasRect.top;

		const newImage = {
			id: Date.now(), // Unique ID for the image on canvas
			src: imageSrc,
			alt: imageAlt,
			x: dropX - initialDroppedWidth / 2, // Adjust for cursor position relative to image center
			y: dropY - initialDroppedHeight / 2, // Adjust for cursor position relative to image center
			originalWidth,
			originalHeight,
			baseWidth: initialDroppedWidth, // Store unscaled width
			baseHeight: initialDroppedHeight, // Store unscaled height
			currentWidth: initialDroppedWidth * zoomLevel, // Apply initial zoom
			currentHeight: initialDroppedHeight * zoomLevel, // Apply initial zoom
		};
		setCanvasImages((prevImages) => [...prevImages, newImage]);
		setSelectedImageId(newImage.id); // Select the newly dropped image

		// Automatically remove background
		handleRemoveBackground(newImage.id, newImage.src);
	};

	const handleDragStart = (e, item) => {
		e.dataTransfer.setData('image/src', item.image);
		e.dataTransfer.setData('image/alt', item.title);
		e.dataTransfer.setData('source/type', 'gallery'); // Indicate drag source
	};

	const handleCanvasImageClick = (id) => {
		setSelectedImageId((prevSelectedId) => (prevSelectedId === id ? null : id));
	};

	const handleCanvasClick = () => {
		setSelectedImageId(null); // Deselect image when clicking on canvas empty space
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

	// Revoke object URLs when images are removed from canvasImages
	useEffect(() => {
		if (selectedImageId && canvasRef.current) {
			canvasRef.current.focus();
		}
	}, [selectedImageId]);

	// Effect to apply zoom level to all images
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
		const MOVE_AMOUNT = 5; // Pixels to move per arrow key press
		const SMALL_MOVE_AMOUNT = 1; // Pixels to move per arrow key press when Shift is held

		const handleKeyDown = (e) => {
			console.log('Key pressed:', e.key, 'Selected Image ID:', selectedImageId);

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
									updated = true; // Mark as updated to prevent default behavior
									return null; // Remove the image
								default:
									return img;
							}
							return { ...img, x: newX, y: newY };
						}
						return img;
					});

					if (updated) {
						e.preventDefault(); // Prevent default scroll behavior for arrow keys and delete
						if (e.key === 'Delete' || e.key === 'Backspace') {
							setSelectedImageId(null); // Deselect after deletion
						}
					}
					return newImages.filter(Boolean); // Filter out nulls from deleted images
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedImageId]);

	return (
		<main className='flex min-h-screen flex-col items-center max-w-7xl m-auto p-5'>
			<h1 className='text-4xl font-bold mb-8'>Mood Board Scraper</h1>
			<form onSubmit={handleSubmit} className='w-full mb-8'>
				<div className='flex items-center border-b border-teal-500 py-2'>
					<input className='appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none' type='text' placeholder='Enter URL' value={url} onChange={(e) => setUrl(e.target.value)} />
					<button className='flex-shrink-0 bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-sm border-4 text-white py-1 px-2 rounded' type='submit' disabled={loading}>
						{loading ? 'Scraping...' : 'Scrape'}
					</button>
				</div>
			</form>

            {canvasImages.length >= 2 && (
                <div className='w-full mb-4'>
                    <label htmlFor='zoom-slider' className='block text-gray-700 text-sm font-bold mb-2'>
                        Zoom: {Math.round(zoomLevel * 100)}%
                    </label>
                    <input
                        type='range'
                        id='zoom-slider'
                        min='0.5'
                        max='2.0'
                        step='0.05'
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
                    />
                </div>
            )}

			{data && (
				<div className='flex flex-col lg:flex-row w-full gap-8'>
					{/* Scraped Images Section (30%) */}
					<div className='lg:w-3/12 p-4 border rounded-lg'>
						<h2 className='text-2xl font-bold mb-4'>Scraped Images</h2>
						{data.error ? (
							<p className='text-red-500'>{data.error}</p>
						) : (
							<div>
								<div className='mb-8'>
									<h3 className='text-xl font-bold mb-2'>Main Product</h3>
									{data.image && (
										<div draggable onDragStart={(e) => handleDragStart(e, { title: data.title, image: data.image })} className='cursor-grab inline-block p-2 border rounded-lg'>
											<img src={data.image} alt={data.title} className='w-32 h-32 object-contain' />
											<p className='text-sm text-center mt-1'>{data.title}</p>
										</div>
									)}
								</div>

								{data.goesWellWith && data.goesWellWith.length > 0 && (
									<div className='mt-4'>
										<h3 className='text-xl font-bold mb-2'>Goes Well With</h3>
										<div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
											{data.goesWellWith.map((item, index) => (
												<div key={index} draggable onDragStart={(e) => handleDragStart(e, item)} className='cursor-grab p-2 border rounded-lg flex flex-col items-center'>
													{item.image && <img src={item.image} alt={item.title} className='w-24 h-24 object-contain' />}
													<p className='text-sm text-center mt-1'>{item.title}</p>
												</div>
											))}
										</div>
									</div>
								)}

								{data.youMayAlsoLike && data.youMayAlsoLike.length > 0 && (
									<div className='mt-4'>
										<h3 className='text-xl font-bold mb-2'>You May Also Like</h3>
										<div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
											{data.youMayAlsoLike.map((item, index) => (
												<div key={index} draggable onDragStart={(e) => handleDragStart(e, item)} className='cursor-grab p-2 border rounded-lg flex flex-col items-center'>
													{item.image && <img src={item.image} alt={item.title} className='w-24 h-24 object-contain' />}
													<p className='text-sm text-center mt-1'>{item.title}</p>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Canvas Section (70%) */}
					<div
						ref={canvasRef} // Attach the ref here
						className='lg:w-9/12 h-[600px] border-2 border-dashed border-gray-400 rounded-lg relative overflow-hidden'
						onDrop={handleImageDrop}
												onDragOver={(e) => e.preventDefault()}
						onClick={handleCanvasClick} // Handle click on canvas to deselect
						tabIndex={0} // Make the div focusable to receive keyboard events
					>
						<h2 className='text-2xl font-bold mb-4 text-center'>Your Mood Board Canvas</h2>
						{canvasImages.map((img) => (
							<DraggableImage key={img.id} img={img} onStop={handleDragStop} onDrag={handleDrag} onClick={handleCanvasImageClick} isSelected={img.id === selectedImageId} onBringToFront={bringToFront} onSendToBack={sendToBack} onRemoveBackground={handleRemoveBackground} />
						))}
					</div>
				</div>
			)}
		</main>
	);
}
