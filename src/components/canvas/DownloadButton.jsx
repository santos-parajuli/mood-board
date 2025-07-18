'use client';

import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useState } from 'react';

const DownloadButton = ({ canvasImages }) => {
	const QUALITY_SCALE_FACTOR = 3;
	const [isDownloading, setIsDownloading] = useState(false); // Add state for button disable

	const toHighQualityDataUrl = async (url) => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth * QUALITY_SCALE_FACTOR;
				canvas.height = img.naturalHeight * QUALITY_SCALE_FACTOR;
				const ctx = canvas.getContext('2d');
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				ctx.scale(QUALITY_SCALE_FACTOR, QUALITY_SCALE_FACTOR);
				ctx.drawImage(img, 0, 0);
				resolve({
					dataUrl: canvas.toDataURL('image/png', 1.0),
					width: img.naturalWidth,
					height: img.naturalHeight,
				});
			};
			img.onerror = reject;
			img.src = url;
		});
	};
	const addImageWithCover = async (pdf, imgData, x, y, targetWidth, targetHeight) => {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = targetWidth * QUALITY_SCALE_FACTOR;
				canvas.height = targetHeight * QUALITY_SCALE_FACTOR;
				const ctx = canvas.getContext('2d');
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				const imgAspect = img.naturalWidth / img.naturalHeight;
				const targetAspect = targetWidth / targetHeight;
				let sourceX = 0;
				let sourceY = 0;
				let sourceWidth = img.naturalWidth;
				let sourceHeight = img.naturalHeight;
				if (imgAspect > targetAspect) {
					sourceHeight = img.naturalHeight;
					sourceWidth = sourceHeight * targetAspect;
					sourceX = (img.naturalWidth - sourceWidth) / 2;
				} else {
					sourceWidth = img.naturalWidth;
					sourceHeight = sourceWidth / targetAspect;
					sourceY = (img.naturalHeight - sourceHeight) / 2;
				}
				ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
				pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', x, y, targetWidth, targetHeight, undefined, 'FAST');
				resolve();
			};
			img.src = imgData;
		});
	};
	const handleDownload = async () => {
		setIsDownloading(true);
		const downloadPromise = new Promise(async (resolve, reject) => {
			try {
				// Load logo first
				const logoData = await toHighQualityDataUrl('/toniclogo.png');
				// Prepare all images with high quality data URLs
				const imagesWithData = await Promise.all(
					canvasImages.map(async (img) => {
						if (!img.dataUrl) {
							const { dataUrl, width, height } = await toHighQualityDataUrl(img.originalSrc || img.src);
							img.dataUrl = dataUrl;
							img.naturalWidth = width;
							img.naturalHeight = height;
						}
						return img;
					})
				);
				// Create PDF with higher quality settings
				const pdf = new jsPDF({
					orientation: 'landscape',
					unit: 'pt',
					format: 'letter',
					hotfixes: ['px_scaling'],
				});
				const pdfWidth = pdf.internal.pageSize.getWidth();
				const pdfHeight = pdf.internal.pageSize.getHeight();
				// Add header with logo
				const headerHeight = 60;
				const padding = 20;
				await addImageWithCover(pdf, logoData.dataUrl, padding, 10, 240, 50);
				// Layout configuration
				const canvasAreaWidth = pdfWidth * 0.7;
				const indexAreaWidth = pdfWidth * 0.3;
				const canvasTopPadding = headerHeight + 20; // Start below header
				// Find the boundaries of our canvas content
				const maxX = Math.max(...canvasImages.map((img) => img.x + img.baseWidth));
				const maxY = Math.max(...canvasImages.map((img) => img.y + img.baseHeight));
				// Calculate scaling factors
				const scaleX = (canvasAreaWidth - 2 * padding) / maxX;
				const scaleY = (pdfHeight - headerHeight - 2 * padding) / maxY; // Account for header
				const scale = Math.min(scaleX, scaleY);
				// Add each image to the PDF with cover behavior
				for (const image of imagesWithData) {
					const scaledX = padding + image.x * scale;
					const scaledY = canvasTopPadding + image.y * scale;
					const scaledWidth = image.baseWidth * scale;
					const scaledHeight = image.baseHeight * scale;
					await addImageWithCover(pdf, image.dataUrl, scaledX, scaledY, scaledWidth, scaledHeight);
				}
				// Draw divider line
				pdf.setDrawColor(200, 200, 200);
				pdf.line(canvasAreaWidth, headerHeight, canvasAreaWidth, pdfHeight);
				// Create unique index items (remove duplicates)
				const uniqueIndexItems = [];
				const seenUrls = new Set();
				for (const image of imagesWithData) {
					if (!seenUrls.has(image.pillowUrl)) {
						seenUrls.add(image.pillowUrl);
						uniqueIndexItems.push(image);
					}
				}
				// Add improved index section with smaller thumbnails
				let yPosition = canvasTopPadding;
				const indexX = canvasAreaWidth + padding;
				const indexContentWidth = indexAreaWidth - 2 * padding;
				const thumbSize = 50; // Reduced from 70 to 50
				const textLineHeight = 14;
				const itemSpacing = 20;
				pdf.setFontSize(11); // Slightly smaller font
				pdf.setTextColor(40, 40, 40);
				for (const image of uniqueIndexItems) {
					// Calculate thumbnail dimensions with cover behavior
					const thumbAspect = image.baseWidth / image.baseHeight;
					let thumbWidth, thumbHeight;
					if (thumbAspect > 1) {
						thumbWidth = thumbSize;
						thumbHeight = thumbSize / thumbAspect;
					} else {
						thumbHeight = thumbSize;
						thumbWidth = thumbSize * thumbAspect;
					}
					// Add high quality thumbnail with cover behavior
					await addImageWithCover(pdf, image.dataUrl, indexX, yPosition, thumbWidth, thumbHeight);
					// Add text with link and proper wrapping
					const textX = indexX + thumbWidth + 10;
					const textWidth = indexContentWidth - thumbWidth - 10;
					pdf.setTextColor(0, 0, 255);
					const textLines = pdf.splitTextToSize(image.alt, textWidth);
					const textHeight = textLines.length * textLineHeight;
					// Draw each line of text
					textLines.forEach((line, i) => {
						pdf.textWithLink(line, textX, yPosition + thumbHeight / 2 - textHeight / 2 + i * textLineHeight + textLineHeight, { url: image.pillowUrl });
					});
					pdf.setTextColor(40, 40, 40);
					yPosition += Math.max(thumbHeight, textHeight) + itemSpacing;
				}
				// Add footer section
				const footerY = pdfHeight - 60;
				// Divider line
				pdf.setDrawColor(200, 200, 200);
				pdf.line(padding, footerY - 10, pdfWidth - padding, footerY - 10);
				// Favicon
				try {
					const faviconData = await toHighQualityDataUrl('/favicon.ico');
					await addImageWithCover(pdf, faviconData.dataUrl, padding, footerY, 30, 30);
				} catch (e) {
					console.log('Could not load favicon', e);
				}
				// Contact info
				pdf.setFontSize(10);
				pdf.setTextColor(80, 80, 80);
				const contactInfo = ['36 Northline Rd Unit 6, Toronto, Ontario', '416-699-9879', 'www.tonicliving.ca'];
				contactInfo.forEach((line, i) => {
					pdf.text(line, padding + 40, footerY + 10 + i * 12);
				});
				// Social media icons
				const socialMedia = [
					{
						icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
						url: 'https://www.instagram.com/tonicliving/',
					},
					{
						icon: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png',
						url: 'https://www.facebook.com/tonicliving/',
					},
					{
						icon: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png',
						url: 'https://www.pinterest.ca/tonicliving/',
					},
				];
				let socialX = pdfWidth - 120;
				const socialSize = 15;
				const socialSpacing = 25;
				for (const platform of socialMedia) {
					try {
						const iconData = await toHighQualityDataUrl(platform.icon);
						await addImageWithCover(pdf, iconData.dataUrl, socialX, footerY + 5, socialSize, socialSize);
						pdf.link(socialX, footerY + 5, socialSize, socialSize, { url: platform.url });
						socialX += socialSpacing;
					} catch (e) {
						console.log(`Could not load ${platform.url} icon`, e);
					}
				}
				// Save PDF
				pdf.save('mood-board-high-quality.pdf');
				resolve('Mood board downloaded successfully!');
			} catch (error) {
				console.error('Error generating PDF:', error);
				reject('Failed to download mood board');
			} finally {
				setIsDownloading(false); // Re-enable button when done (success or error)
			}
		});
		toast.promise(downloadPromise, {
			loading: 'Generating Your Mood Board.',
			success: (message) => message,
			error: (err) => err,
		});
	};
	return (
		<Button
			onClick={handleDownload}
			disabled={isDownloading} // Add disabled state
		>
			{isDownloading ? 'Downloading...' : 'Download Mood Board'}
		</Button>
	);
};
export default DownloadButton;
