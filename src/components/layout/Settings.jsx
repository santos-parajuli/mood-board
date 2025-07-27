import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import useCanvasStore from '@/store/canvasStore';
import useMoodboardStore from '@/store/moodboardStore';
import { useRef } from 'react';

const Settings = () => {
	const { getMoodboardState, setMoodboardState, region, setRegion, name, setName, createMoodboard, deleteMoodboard, selectMoodboard } = useMoodboardStore();
	const activeMoodboard = getMoodboardState();
	const { canvasRef } = useCanvasStore();
	const fileInputRef = useRef(null);

	const loadMoodboard = (event) => {
		const file = event.target.files[0];
		if (!file) {
			return;
		}
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
					if (metadata.metadata && metadata.metadata.get('jspdf:metadata')) {
						loadedState = JSON.parse(metadata.metadata.get('jspdf:metadata'));
					} else {
						toast.error('PDF does not contain moodboard data.');
						return;
					}
				} else if (file.type === 'application/json') {
					loadedState = JSON.parse(e.target.result);
				} else {
					toast.error('Unsupported file type. Please load a JSON or PDF file.');
					return;
				}
				setName(loadedState.name);
				setRegion(loadedState.region);
				for (const moodboard of loadedState.moodboards) {
					const newMoodboardId = `moodboard-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
					createMoodboard();
					setMoodboardState({
						id: newMoodboardId,
						name: moodboard.name || 'Loaded Moodboard',
						canvasImages: moodboard.canvasImages || [],
						canvasTexts: moodboard.canvasTexts || [],
						selectedGalleryItems: moodboard.selectedGalleryItems || [],
						selectedComboboxItem: moodboard.selectedComboboxItem || '',
						region: moodboard.region || 'CA',
					});
					selectMoodboard(newMoodboardId);

					await new Promise((resolve) => setTimeout(resolve, 100));

					if (canvasRef.current && moodboard.canvasImages) {
						const imagePromises = moodboard.canvasImages.map((img) => {
							if (img.originalSrc) {
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

	return (
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
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button variant='outline'>Close</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default Settings;
