import { Copy, PlusCircle, SettingsIcon, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import DeleteMoodboardDialog from '../ui/DeleteMoodboardDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import useCanvasStore from '@/store/canvasStore';
import useMoodboardStore from '@/store/moodboardStore';

const Settings = () => {
	const { moodboards, activeMoodboardId, getMoodboardState, setMoodboardState, region, setRegion, name, setName, createMoodboard, deleteMoodboard, selectMoodboard, duplicateMoodboard, allXlsxData, setAllXlsxData } = useMoodboardStore();
	const activeMoodboard = getMoodboardState();
	const { canvasRef } = useCanvasStore();
	const fileInputRef = useRef(null);
	const imageInputRef = useRef(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [scrapeUrl, setScrapeUrl] = useState('');
	const [isScraping, setIsScraping] = useState(false);
	const handleCreateMoodboard = () => {
		createMoodboard(name);
		toast.success(`New moodboard created!`);
	};
	const handleDeleteMoodboardClick = () => {
		setIsDeleteDialogOpen(true);
	};
	const handleDuplicateMoodboard = () => {
		duplicateMoodboard(activeMoodboardId);
		toast.success('Moodboard duplicated!');
	};
	const handleConfirmDelete = () => {
		if (moodboards.length <= 1) {
			toast.error('Cannot delete the last moodboard.');
			setIsDeleteDialogOpen(false);
			return;
		}
		deleteMoodboard(activeMoodboardId);
		toast.success('Moodboard deleted!');
		setIsDeleteDialogOpen(false);
	};
	const handleScrape = async () => {
		if (!scrapeUrl) {
			toast.error('Please enter a URL to scrape.');
			return;
		}
		setIsScraping(true);
		const scrapePromise = new Promise(async (resolve, reject) => {
			try {
				const url = new URL(scrapeUrl);
				const hostname = url.hostname;
				if (!hostname.includes('tonicliving.ca') && !hostname.includes('tonicliving.com')) {
					reject(new Error('Please enter a URL from tonicliving.ca or tonicliving.com.'));
					return;
				}
				const pathSegments = url.pathname.split('/');
				const productSlug = pathSegments[pathSegments.indexOf('products') + 1];
				if (!productSlug) {
					reject(new Error('Could not extract product information from the URL.'));
					return;
				}
				const isProductAlreadyAdded = allXlsxData.some((item) => {
					return item.Pillow_URL && item.Pillow_URL.includes(productSlug);
				});
				if (isProductAlreadyAdded) {
					resolve('This product is already in your list.');
					return;
				}
				const response = await fetch('/api/scrape', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ url: scrapeUrl }),
				});
				const data = await response.json();
				if (response.ok) {
					await handleAddToXLSX(data);
					const updatedXlsxDataResponse = await fetch('/api/xlsx');
					if (updatedXlsxDataResponse.ok) {
						const result = await updatedXlsxDataResponse.json();
						setAllXlsxData(result.data);
					} else {
						console.error('Failed to re-fetch XLSX data after scrape:', updatedXlsxDataResponse.statusText);
					}
					resolve('Added to list Successfully!');
				} else {
					reject(new Error(data.error || 'Failed to scrape the website'));
				}
			} catch (error) {
				console.error('Scraping error:', error);
				reject(error);
			} finally {
				setIsScraping(false);
			}
		});
		toast.promise(scrapePromise, {
			loading: 'Adding to list...',
			success: (message) => message,
			error: (err) => err.message,
		});
	};
	const handleAddToXLSX = async (data) => {
		if (!data) {
			toast.error('No scraped data to add.');
			return;
		}
		try {
			const response = await fetch('/api/xlsx', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});
			if (response.ok) {
				toast.success('Data added to XLSX successfully!');
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to add data to XLSX');
			}
		} catch (error) {
			console.error('Error adding to XLSX:', error);
			toast.error(error.message);
		}
	};
	const loadMoodboard = (event) => {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				let loadedState;

				if (file.type === 'application/pdf') {
					const pdfjsLib = require('pdfjs-dist');
					pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
					const pdfData = new Uint8Array(e.target.result);
					const loadingTask = pdfjsLib.getDocument({ data: pdfData });
					const pdfDoc = await loadingTask.promise;
					const metadata = await pdfDoc.getMetadata();
					const compressedMetadata = metadata.info.moodboardData || metadata.metadata?.get('jspdf:metadata');

					if (!compressedMetadata) {
						toast.error('PDF does not contain moodboard data.');
						return;
					}
					loadedState = JSON.parse(compressedMetadata);
				} else if (file.type === 'application/json') {
					loadedState = JSON.parse(e.target.result);
				} else {
					toast.error('Unsupported file type. Please load a JSON or PDF file.');
					return;
				}
				console.log(loadedState);
				// Restore basic info
				setName(loadedState.name);
				setRegion(loadedState.region);

				for (const moodboard of loadedState.moodboards) {
					const newMoodboardId = `moodboard-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
					createMoodboard();

					const newCanvasImages = [];
					if (moodboard.canvasImages) {
						for (const img of moodboard.canvasImages) {
							if (img.dataUrl) {
								const byteString = atob(img.dataUrl.split(',')[1]);
								const mimeString = img.dataUrl.split(',')[0].split(':')[1].split(';')[0];
								const ab = new ArrayBuffer(byteString.length);
								const ia = new Uint8Array(ab);
								for (let i = 0; i < byteString.length; i++) {
									ia[i] = byteString.charCodeAt(i);
								}
								const blob = new Blob([ab], { type: mimeString });
								const url = URL.createObjectURL(blob);
								newCanvasImages.push({ ...img, originalSrc: url });
							} else {
								newCanvasImages.push(img);
							}
						}
					}

					setMoodboardState({
						id: newMoodboardId,
						name: moodboard.name || 'Loaded Moodboard',
						canvasImages: newCanvasImages || [],
						canvasTexts: moodboard.canvasTexts || [],
						selectedGalleryItems: moodboard.selectedGalleryItems || [],
						selectedComboboxItem: moodboard.selectedComboboxItem || '',
						region: moodboard.region || 'CA',
					});
					selectMoodboard(newMoodboardId);

					// If you have background removal logic
					if (canvasRef.current && newCanvasImages) {
						const imagePromises = newCanvasImages.map((img) => {
							if (img.originalSrc && !img.dataUrl) {
								return canvasRef.current.handleRemoveBackground(img.id, img.originalSrc);
							}
							return null;
						});
						await Promise.all(imagePromises.filter((p) => p));
					}
				}

				deleteMoodboard('default-moodboard');
				toast.success('Moodboard state loaded!');
			} catch (error) {
				console.error('Error parsing file:', error);
				toast.error('Failed to load moodboard state. Invalid file.');
			}
		};

		if (file.type === 'application/pdf') {
			reader.readAsArrayBuffer(file);
		} else {
			reader.readAsText(file);
		}
	};

	const handleImageUpload = (event) => {
		const file = event.target.files[0];
		if (!file) return;
		const currentImages = activeMoodboard.canvasImages || [];

		// Count only the uploaded ones
		const uploadedCount = currentImages.filter((img) => img.uploaded).length;

		if (uploadedCount >= 2) {
			toast.error('You can add at most 2 custom images.');
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			const src = e.target.result;
			const img = new Image();
			img.onload = () => {
				const newImage = {
					id: `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
					src: src,
					originalSrc: src,
					x: 100,
					y: 100,
					width: 200,
					height: (200 * img.height) / img.width,
					currentWidth: 200,
					currentHeight: (200 * img.height) / img.width,
					baseWidth: 200,
					baseHeight: (200 * img.height) / img.width,
					resizable: false,
					uploaded: true,
				};
				const updatedCanvasImages = [...currentImages, newImage];
				setMoodboardState({ ...activeMoodboard, canvasImages: updatedCanvasImages });
				toast.success('Image added to canvas!');
			};
			img.src = src;
		};
		reader.readAsDataURL(file);
		if (event.target) {
			event.target.value = null;
		}
	};
	return (
		<>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>
						<SettingsIcon className='h-4 w-4' />
					</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Settings</SheetTitle>
						<SheetDescription>Manage your moodboard settings here.</SheetDescription>
					</SheetHeader>
					<div className='grid flex-1 auto-rows-min gap-6 px-4 py-4'>
						<div className='grid gap-3'>
							<Label>Moodboards</Label>
							<div className='flex items-center gap-2'>
								<Select onValueChange={selectMoodboard} value={activeMoodboardId}>
									<SelectTrigger className='w-full'>
										<SelectValue placeholder='Select Moodboard' />
									</SelectTrigger>
									<SelectContent>
										{moodboards.map((mb, index) => (
											<SelectItem key={mb.id} value={mb.id}>
												{name} - {index + 1}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button onClick={handleCreateMoodboard} variant='outline' size='icon'>
									<PlusCircle className='h-4 w-4' />
								</Button>
								<Button onClick={handleDuplicateMoodboard} variant='outline' size='icon'>
									<Copy className='h-4 w-4' />
								</Button>
								<Button onClick={handleDeleteMoodboardClick} variant='outline' size='icon' disabled={moodboards.length <= 1}>
									<Trash2 className='h-4 w-4' />
								</Button>
							</div>
						</div>
						<div className='grid gap-3'>
							<Label htmlFor='moodboard-name'>Moodboard Name</Label>
							<Input id='moodboard-name' value={name || ''} onChange={(e) => setName(e.target.value)} />
						</div>
						<div className='grid gap-3'>
							<Label>Region</Label>
							<Select onValueChange={(value) => setRegion(value)} value={region || 'CA'}>
								<SelectTrigger>
									<SelectValue placeholder='Select a region' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='CA'>Canada</SelectItem>
									<SelectItem value='US'>United States</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className='grid gap-3'>
							<Label>Load Moodboard</Label>
							<input type='file' ref={fileInputRef} onChange={loadMoodboard} style={{ display: 'none' }} accept='.json,.pdf' />
							<Button onClick={() => fileInputRef.current.click()}>Load from file</Button>
						</div>
						<div className='grid gap-3'>
							<Label>Custom Images</Label>
							<input type='file' ref={imageInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept='image/*' />
							<Button onClick={() => imageInputRef.current.click()} disabled={activeMoodboard.canvasImages.filter((img) => img.uploaded).length === 2}>
								Add Image
							</Button>
						</div>
						<div className='grid gap-3'>
							<Label htmlFor='scrape-url'>Scrape URL</Label>
							<div className='flex items-center gap-2'>
								<Input id='scrape-url' value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} placeholder='https://www.example.com' />
								<Button onClick={handleScrape} disabled={isScraping}>
									Go
								</Button>
							</div>
						</div>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
			<DeleteMoodboardDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={handleConfirmDelete} />
		</>
	);
};

export default Settings;
