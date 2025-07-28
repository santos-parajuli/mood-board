import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
import DownloadButton from '../canvas/DownloadButton';
import Settings from './Settings';
import { TypeIcon } from 'lucide-react';
import useMoodboardStore from '@/store/moodboardStore';

const Header = () => {
	const { region, setCanvasTexts } = useMoodboardStore();

	const addText = () => {
		const newText = {
			id: `text-${Date.now()}`,
			text: 'Text',
			x: 50,
			y: 50,
			fontWeight: 'normal',
			fontSize: 14,
		};
		setCanvasTexts(newText);
	};

	return (
		<div className='p-4 border-b'>
			<div className='flex md:items-center justify-between md:flex-row flex-col items-start'>
				<h1 className='text-2xl font-bold '>
					Mood Board
					<sup>
						{' '}
						<Badge className='h-5 min-w-5 rounded-full px-1 font-mono tabular-nums' variant='outline'>
							{region}
						</Badge>
					</sup>
				</h1>
				<div className='flex items-center gap-4'>
					<Button onClick={addText} variant='outline' size='icon'>
						<TypeIcon className='h-4 w-4' />
					</Button>
					<Settings />
					<DownloadButton />
				</div>
			</div>
		</div>
	);
};

export default Header;
