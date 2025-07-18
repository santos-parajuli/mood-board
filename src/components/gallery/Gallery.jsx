'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Gallery({ data, onDoubleClick, onDragStart, onDelete }) {
	// Consolidate all main products, goesWellWith, and youMayAlsoLike items
	const allMainProducts = data.mainProducts || [];

	const allGoesWellWith = [];
	const allYouMayAlsoLike = [];

	const uniqueUrls = new Set();

	allMainProducts.forEach((mainProduct) => {
		(mainProduct.goesWellWith || []).forEach((item) => {
			if (!uniqueUrls.has(item.url)) {
				allGoesWellWith.push(item);
				uniqueUrls.add(item.url);
			}
		});
		(mainProduct.youMayAlsoLike || []).forEach((item) => {
			if (!uniqueUrls.has(item.url)) {
				allYouMayAlsoLike.push(item);
				uniqueUrls.add(item.url);
			}
		});
	});

	return (
		<div className='w-1/4 border-r'>
			<ScrollArea className='h-full w-full p-4'>
				<h2 className='text-xl font-bold mb-4'>Products</h2>
				{data.error ? (
					<p className='text-red-500'>{data.error}</p>
				) : (
					<div>
						{/* Display all Main Products */}
						{allMainProducts.length > 0 && (
							<>
								<h3 className='text-lg font-bold mb-2'>Main Products</h3>
								{allMainProducts.map((item, index) => (
									<div onDoubleClick={() => onDoubleClick(item)} key={item.url || index} draggable onDragStart={(e) => onDragStart(e, item)} className='relative group flex items-center p-2 border-b cursor-grab'>
										<img src={item.image} alt={item.title} className='w-16 h-16 object-contain mr-4' />
										<p className='text-sm'>{item.title}</p>
										<Button onClick={() => onDelete(item.url)} variant='destructive' size='icon' className='absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'>
											X
										</Button>
									</div>
								))}
							</>
						)}

						{/* Display all Goes Well With items */}
						{allGoesWellWith.length > 0 && (
							<>
								<h3 className='text-lg font-bold mt-4 mb-2'>Goes Well With</h3>
								{allGoesWellWith.map((item, index) => (
									<div onDoubleClick={() => onDoubleClick(item)} key={item.url || index} draggable onDragStart={(e) => onDragStart(e, item)} className='flex items-center p-2 border-b cursor-grab'>
										<img src={item.image} alt={item.title} className='w-16 h-16 object-contain mr-4' />
										<p className='text-sm'>{item.title}</p>
									</div>
								))}
							</>
						)}

						{/* Display all You May Also Like items */}
						{allYouMayAlsoLike.length > 0 && (
							<>
								<h3 className='text-lg font-bold mt-4 mb-2'>You May Also Like</h3>
								{allYouMayAlsoLike.map((item, index) => (
									<div onDoubleClick={() => onDoubleClick(item)} key={item.url || index} draggable onDragStart={(e) => onDragStart(e, item)} className='flex items-center p-2 border-b cursor-grab'>
										<img src={item.image} alt={item.title} className='w-16 h-16 object-contain mr-4' />
										<p className='text-sm'>{item.title}</p>
									</div>
								))}
							</>
						)}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
