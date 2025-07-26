import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function parseAndLookupRelatedItems(text, allXlsxData) {
	if (!text) return [];
	const items = text.split(';');
	const parsedItems = items
		.map((item) => {
			const trimmedItem = item.trim();
			const match = trimmedItem.match(/(.*?)\s*\((https?:\/\/[^)]+)\)/);
			if (match) {
				const title = match[1].trim();
				const foundProduct = allXlsxData.find((xlsxItem) => xlsxItem.Name === title);
				if (foundProduct) {
					return {
						title: foundProduct.Name,
						url: foundProduct.Pillow_URL,
						image: foundProduct.IMAGE_URL,
						withInsertID: foundProduct.With_Insert_ID,
						withoutInsertID: foundProduct.Without_Insert_ID,
					};
				} else {
					return null;
				}
			}
			return null;
		})
		.filter(Boolean);
	return parsedItems;
}
