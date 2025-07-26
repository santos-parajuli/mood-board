'use client';

import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import useMoodboardStore from '../../store/moodboardStore';
import { useState } from 'react';

const DownloadButton = () => {
	const { moodboards, name, region } = useMoodboardStore();
	const QUALITY_SCALE_FACTOR = 3;
	const [isDownloading, setIsDownloading] = useState(false);

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
		if (!moodboards.length) {
			toast.error('No moodboards to download');
			return;
		}

		setIsDownloading(true);
		const downloadPromise = new Promise(async (resolve, reject) => {
			try {
				const pdf = new jsPDF({
					orientation: 'landscape',
					unit: 'pt',
					format: 'letter',
					hotfixes: ['px_scaling'],
				});

				const pdfWidth = pdf.internal.pageSize.getWidth();
				const pdfHeight = pdf.internal.pageSize.getHeight();
				const headerHeight = 60;
				const padding = 20;
				const canvasAreaWidth = pdfWidth * 0.7;
				const indexAreaWidth = pdfWidth * 0.3;
				const canvasTopPadding = headerHeight + padding;
				const canvasBottomPadding = pdfHeight - 60 - padding;

				// Load logo once
				const logoData = await toHighQualityDataUrl('/toniclogo.png');

				for (const moodboard of moodboards) {
					if (moodboards.indexOf(moodboard) > 0) {
						pdf.addPage();
					}

					const { canvasImages, canvasTexts, moodboardName } = moodboard;

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

					// Add header with logo
					await addImageWithCover(pdf, logoData.dataUrl, padding, 10, 240, 50);

					// Calculate content boundaries
					let minX = Infinity,
						minY = Infinity,
						maxX = 0,
						maxY = 0;

					canvasImages.forEach((img) => {
						minX = Math.min(minX, img.x);
						minY = Math.min(minY, img.y);
						maxX = Math.max(maxX, img.x + img.baseWidth);
						maxY = Math.max(maxY, img.y + img.baseHeight);
					});

					canvasTexts.forEach((text) => {
						const textWidth = text.text.length * (text.fontSize / 2);
						const textHeight = text.fontSize;
						minX = Math.min(minX, text.x);
						minY = Math.min(minY, text.y);
						maxX = Math.max(maxX, text.x + textWidth);
						maxY = Math.max(maxY, text.y + textHeight);
					});

					// If no content, set default bounds
					if (canvasImages.length === 0 && canvasTexts.length === 0) {
						minX = 0;
						minY = 0;
						maxX = 0;
						maxY = 0;
					}

					const contentWidth = maxX - minX;
					const contentHeight = maxY - minY;

					// Calculate available canvas space
					const availableCanvasWidth = canvasAreaWidth - 2 * padding;
					const availableCanvasHeight = canvasBottomPadding - canvasTopPadding;

					// Calculate uniform scale factor
					const scaleX = contentWidth > 0 ? availableCanvasWidth / contentWidth : 1;
					const scaleY = contentHeight > 0 ? availableCanvasHeight / contentHeight : 1;
					const uniformScale = Math.min(scaleX, scaleY);

					// Add each image to the PDF with uniform scaling
					for (const image of imagesWithData) {
						const scaledX = padding + (image.x - minX) * uniformScale;
						const scaledY = canvasTopPadding + (image.y - minY) * uniformScale;
						const scaledWidth = image.baseWidth * uniformScale;
						const scaledHeight = image.baseHeight * uniformScale;

						await addImageWithCover(pdf, image.dataUrl, scaledX, scaledY, scaledWidth, scaledHeight);
					}

					// Add text elements with uniform scaling
					for (const text of canvasTexts) {
						const scaledX = padding + (text.x - minX) * uniformScale;
						const scaledY = canvasTopPadding + (text.y - minY) * uniformScale + text.fontSize;
						pdf.setFontSize(text.fontSize);
						pdf.setFont(undefined, text.fontWeight);
						pdf.text(text.text, scaledX, scaledY);
					}

					// Draw divider line
					pdf.setDrawColor(200, 200, 200);
					const footerDividerY = pdfHeight - 60 - 10;
					pdf.line(canvasAreaWidth, headerHeight, canvasAreaWidth, footerDividerY);

					// Create unique index items
					const uniqueIndexItems = [];
					const seenUrls = new Set();
					for (const image of imagesWithData) {
						if (!seenUrls.has(image.pillowUrl)) {
							seenUrls.add(image.pillowUrl);
							uniqueIndexItems.push(image);
						}
					}

					// Add index section
					let yPosition = canvasTopPadding;
					const indexX = canvasAreaWidth + padding;
					const indexContentWidth = indexAreaWidth - 2 * padding;
					const thumbSize = 50;
					const textLineHeight = 14;
					const itemSpacing = 20;

					pdf.setFontSize(11);
					pdf.setTextColor(40, 40, 40);

					for (const image of uniqueIndexItems) {
						const thumbAspect = image.baseWidth / image.baseHeight;
						let thumbWidth, thumbHeight;

						if (thumbAspect > 1) {
							thumbWidth = thumbSize;
							thumbHeight = thumbSize / thumbAspect;
						} else {
							thumbHeight = thumbSize;
							thumbWidth = thumbSize * thumbAspect;
						}

						await addImageWithCover(pdf, image.dataUrl, indexX, yPosition, thumbWidth, thumbHeight);

						const textX = indexX + thumbWidth + 10;
						const textWidth = indexContentWidth - thumbWidth - 10;
						pdf.setTextColor(0, 0, 255);

						const textLines = pdf.splitTextToSize(image.alt, textWidth);
						const textHeight = textLines.length * textLineHeight;
						const baseUrl = region === 'CA' ? 'https://www.tonicliving.ca' : 'https://www.tonicliving.com';
						const productUrl = `${baseUrl}/products/${image.pillowUrl.split('/').pop()}`;

						textLines.forEach((line, i) => {
							pdf.textWithLink(line, textX, yPosition + thumbHeight / 2 - textHeight / 2 + i * textLineHeight + textLineHeight, { url: productUrl });
						});

						pdf.setTextColor(40, 40, 40);
						yPosition += Math.max(thumbHeight, textHeight) + itemSpacing;
					}

					// Add footer section
					const footerY = pdfHeight - 60;
					pdf.setDrawColor(200, 200, 200);
					pdf.line(padding, footerY - 10, pdfWidth - padding, footerY - 10);

					// Add favicon
					try {
						const faviconData = await toHighQualityDataUrl('/favicon.ico');
						await addImageWithCover(pdf, faviconData.dataUrl, padding, footerY, 30, 30);
					} catch (e) {
						console.log('Could not load favicon', e);
					}

					// Add contact info
					pdf.setFontSize(10);
					pdf.setTextColor(80, 80, 80);
					const contactInfo = ['36 Northline Rd Unit 6, Toronto, Ontario', '416-699-9879', `www.tonicliving.${region === 'CA' ? 'ca' : 'com'}`];

					contactInfo.forEach((line, i) => {
						pdf.text(line, padding + 40, footerY + 10 + i * 12);
					});

					// Add social media icons
					const socialMedia = [
						{ icon: '/Instagram.png', url: 'https://www.instagram.com/tonicliving/' },
						{ icon: '/Facebook.png', url: 'https://www.facebook.com/tonicliving/' },
						{ icon: '/Pinterest.png', url: 'https://www.pinterest.com/tonicliving/' },
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
							console.log(`Could not load ${platform.icon} icon`, e);
						}
					}
				}
				const metadata = {
					moodboards,
					name,
					region, // assuming `name` is defined as a string variable, e.g. "My Moodboard"
				};
				console.log(metadata);
				pdf.addMetadata(JSON.stringify(metadata), 'jspdf:metadata');
				pdf.save(`${name}.pdf`);
				resolve('Mood boards downloaded successfully!');
			} catch (error) {
				console.error('Error during PDF generation:', error);
				reject('Failed to download mood boards');
			} finally {
				setIsDownloading(false);
			}
		});

		toast.promise(downloadPromise, {
			loading: 'Generating Your Mood Boards...',
			success: (message) => message,
			error: (err) => err,
		});
	};

	return (
		<Button onClick={handleDownload} disabled={isDownloading}>
			{isDownloading ? 'Downloading...' : 'Download All Mood Boards'}
		</Button>
	);
};

export default DownloadButton;
