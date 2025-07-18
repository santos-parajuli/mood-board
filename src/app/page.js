'use client';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import Canvas from '../components/canvas/Canvas';
import { ChevronsUpDown } from 'lucide-react';
import DownloadButton from '../components/canvas/DownloadButton.jsx';
import Gallery from '../components/gallery/Gallery';
import XLSXDataFetcher from '../components/XLSXDataFetcher';
import { parseAndLookupRelatedItems } from '@/lib/utils';

export default function Home() {
	const [zoomLevel, setZoomLevel] = useState(1.0);
	const [allXlsxData, setAllXlsxData] = useState([]);
	const [selectedGalleryItems, setSelectedGalleryItems] = useState([]);
	const [openCombobox, setOpenCombobox] = useState(false);
	const [selectedComboboxItem, setSelectedComboboxItem] = useState('');
	const [canvasImages, setCanvasImages] = useState([]);
	const [selectedImageId, setSelectedImageId] = useState(null);
	const canvasRef = useRef(null);

	const handleDataLoaded = (loadedData) => {
		setAllXlsxData(loadedData);
	};

	const handleSelectPillow = async (pillowName) => {
		const selectedPillow = allXlsxData.find((p) => p.Name === pillowName);
		if (selectedPillow) {
			setSelectedComboboxItem(pillowName);
			const newMainProduct = {
				title: selectedPillow.Name,
				image: selectedPillow.IMAGE_URL,
				url: selectedPillow.Pillow_URL,
				withInsertID: selectedPillow.With_Insert_ID,
				withoutInsertID: selectedPillow.Without_Insert_ID,
				goesWellWith: parseAndLookupRelatedItems(selectedPillow.Goes_Well_With, allXlsxData),
				youMayAlsoLike: parseAndLookupRelatedItems(selectedPillow.You_May_Also_Like, allXlsxData),
			};
			setSelectedGalleryItems((prevItems) => [...prevItems, newMainProduct]);
		}
	};

	const handleDoubleClick = (item) => {
		canvasRef.current.addImageToCanvas(item);
	};

	const handleDelete = (url) => {
		setSelectedGalleryItems((prevItems) => prevItems.filter((item) => item.url !== url));
	};

	const handleDragStart = (e, item) => {
		console.log(item);
		e.dataTransfer.setData('image/src', item.image);
		e.dataTransfer.setData('image/alt', item.title);
		e.dataTransfer.setData('withInsertID', item.withInsertID);
		e.dataTransfer.setData('withoutInsertID', item.withoutInsertID);
		e.dataTransfer.setData('pillowURL', item.url);
		e.dataTransfer.setData('source/type', 'gallery');
	};

	useEffect(() => {
		setCanvasImages((prevImages) =>
			prevImages.map((img) => ({
				...img,
				currentWidth: img.baseWidth * zoomLevel,
				currentHeight: img.baseHeight * zoomLevel,
			}))
		);
	}, [zoomLevel]);

	return (
		<main className='flex flex-col h-screen w-full p-4'>
			<div className='p-4 border-b'>
				<div className='flex items-center justify-between'>
					<h1 className='text-2xl font-bold'>Mood Board</h1>
					{canvasImages.length >= 1 && (
						<div className='w-1/3'>
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
					<DownloadButton canvasImages={canvasImages} setSelectedImageId={setSelectedImageId} />
				</div>
				<XLSXDataFetcher onDataLoaded={handleDataLoaded} />
				<div className='mb-6 mt-4'>
					<Popover open={openCombobox} onOpenChange={setOpenCombobox}>
						<PopoverTrigger asChild>
							<Button variant='outline' role='combobox' aria-expanded={openCombobox} className='w-[280px] justify-between'>
								{selectedGalleryItems.length > 0 ? allXlsxData.find((pillow) => pillow.Name === selectedComboboxItem)?.Name : 'Select a pillow...'}
								<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-[280px] p-0'>
							<Command>
								<CommandInput placeholder='Search pillow...' />
								<CommandList>
									<CommandEmpty>No pillow found.</CommandEmpty>
									<CommandGroup>
										{allXlsxData.map((pillow) => (
											<CommandItem
												key={pillow.Name}
												value={pillow.Name}
												onSelect={(currentValue) => {
													handleSelectPillow(currentValue);
													setOpenCombobox(false);
												}}>
												{pillow.Name}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</div>

			<div className='flex flex-grow overflow-hidden'>
				{selectedGalleryItems.length > 0 && <Gallery data={{ mainProducts: selectedGalleryItems }} onDoubleClick={handleDoubleClick} onDragStart={handleDragStart} onDelete={handleDelete} />}
				<Canvas ref={canvasRef} canvasImages={canvasImages} setCanvasImages={setCanvasImages} selectedImageId={selectedImageId} setSelectedImageId={setSelectedImageId} zoomLevel={zoomLevel} />
			</div>
		</main>
	);
}
