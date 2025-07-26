import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
import DeleteMoodboardDialog from '../ui/DeleteMoodboardDialog';
import DownloadButton from '../canvas/DownloadButton';
import Settings from './Settings';
import { toast } from 'sonner';
import useMoodboardStore from '@/store/moodboardStore';
import { useState } from 'react';

const Header = () => {
	const { moodboards, region, activeMoodboardId, selectMoodboard, createMoodboard, deleteMoodboard, name } = useMoodboardStore();

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const handleCreateMoodboard = () => {
		createMoodboard(name);
		toast.success(`New moodboard created!`);
	};

	const handleDeleteMoodboardClick = () => {
		setIsDeleteDialogOpen(true);
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

	return (
		<div className='p-4 border-b'>
			<div className='flex items-center justify-between'>
				<h1 className='text-2xl font-bold'>
					Mood Board
					<sup>
						{' '}
						<Badge className='h-5 min-w-5 rounded-full px-1 font-mono tabular-nums' variant='outline'>
							{region}
						</Badge>
					</sup>
				</h1>
				<div className='flex items-center gap-4'>
					<Select onValueChange={selectMoodboard} value={activeMoodboardId}>
						<SelectTrigger className='w-[180px]'>
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
					<Button onClick={handleDeleteMoodboardClick} variant='outline' size='icon' disabled={moodboards.length <= 1}>
						<Trash2 className='h-4 w-4' />
					</Button>
					<Settings />
					<DownloadButton />
				</div>
			</div>
			<DeleteMoodboardDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={handleConfirmDelete} />
		</div>
	);
};

export default Header;
