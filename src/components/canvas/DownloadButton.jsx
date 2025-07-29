'use client';

import '../../../public/Brown Std Light';

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
				let sourceX = 0,
					sourceY = 0,
					sourceWidth = img.naturalWidth,
					sourceHeight = img.naturalHeight;

				if (imgAspect > targetAspect) {
					sourceWidth = sourceHeight * targetAspect;
					sourceX = (img.naturalWidth - sourceWidth) / 2;
				} else {
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
				console.log(pdf.getFontList());
				pdf.setFont('Brown Std Light', 'normal');
				pdf.setFontSize(12);

				const pdfWidth = pdf.internal.pageSize.getWidth();
				const pdfHeight = pdf.internal.pageSize.getHeight();
				const headerHeight = 60;
				const padding = 20;
				const canvasAreaWidth = pdfWidth * 0.7;
				const indexAreaWidth = pdfWidth * 0.3;
				const canvasTopPadding = headerHeight + padding;
				const canvasBottomPadding = pdfHeight - 60 - padding;

				// Load footer logo once
				const logoData = await toHighQualityDataUrl('/toniclogo.png');

				for (const moodboard of moodboards) {
					if (moodboards.indexOf(moodboard) > 0) pdf.addPage();

					const { canvasImages, canvasTexts } = moodboard;

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
						const textWidth = pdf.getStringUnitWidth(text.text) * text.fontSize;
						const textHeight = text.fontSize;
						minX = Math.min(minX, text.x);
						minY = Math.min(minY, text.y);
						maxX = Math.max(maxX, text.x + textWidth);
						maxY = Math.max(maxY, text.y + textHeight);
					});

					if (canvasImages.length === 0 && canvasTexts.length === 0) {
						minX = 0;
						minY = 0;
						maxX = 0;
						maxY = 0;
					}

					const contentWidth = maxX - minX;
					const contentHeight = maxY - minY;
					const availableCanvasWidth = canvasAreaWidth - 2 * padding;
					const availableCanvasHeight = canvasBottomPadding - canvasTopPadding;
					const scaleX = contentWidth > 0 ? availableCanvasWidth / contentWidth : 1;
					const scaleY = contentHeight > 0 ? availableCanvasHeight / contentHeight : 1;
					const uniformScale = Math.min(scaleX, scaleY);
					const scaledContentWidth = contentWidth * uniformScale;
					const scaledContentHeight = contentHeight * uniformScale;
					const offsetX = (availableCanvasWidth - scaledContentWidth) / 2;
					const offsetY = (availableCanvasHeight - scaledContentHeight) / 2;

					for (const image of imagesWithData) {
						const scaledX = padding + offsetX + (image.x - minX) * uniformScale;
						const scaledY = canvasTopPadding + offsetY + (image.y - minY) * uniformScale;
						const scaledWidth = image.baseWidth * uniformScale;
						const scaledHeight = image.baseHeight * uniformScale;
						await addImageWithCover(pdf, image.dataUrl, scaledX, scaledY, scaledWidth, scaledHeight);
					}
					pdf.setFont('Brown Std Light', 'normal');

					for (const text of canvasTexts) {
						const scaledX = padding + offsetX + (text.x - minX) * uniformScale;
						const scaledY = canvasTopPadding + offsetY + (text.y - minY) * uniformScale + text.fontSize;
						pdf.setFontSize(text.fontSize);
						pdf.setFont('Brown Std Light', text.fontWeight === 'bold' ? 'semibold' : 'normal');
						pdf.text(text.text, scaledX, scaledY);
					}

					pdf.setDrawColor(200, 200, 200);
					const footerDividerY = pdfHeight - 40 - 10;
					pdf.line(canvasAreaWidth, headerHeight, canvasAreaWidth, footerDividerY);

					const uniqueIndexItems = [];
					const seenUrls = new Set();
					for (const image of imagesWithData) {
						if (!seenUrls.has(image.pillowUrl)) {
							seenUrls.add(image.pillowUrl);
							uniqueIndexItems.push(image);
						}
					}

					let yPosition = canvasTopPadding;
					const indexX = canvasAreaWidth + padding;
					const indexContentWidth = indexAreaWidth - 2 * padding;
					const thumbSize = 30;
					const textLineHeight = 12;
					const itemSpacing = 15;
					pdf.setFont('Brown Std Light', 'normal');

					pdf.setFontSize(9);
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
						const textX = indexX + thumbWidth + 8;
						const textWidth = indexContentWidth - thumbWidth - 8;
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

					const footerY = pdfHeight - 40;
					pdf.setDrawColor(200, 200, 200);
					pdf.line(padding, footerY - 10, pdfWidth - padding, footerY - 10);

					const logoWidth = 145;
					const logoHeight = 26.5;
					try {
						await addImageWithCover(pdf, logoData.dataUrl, padding, footerY, logoWidth, logoHeight);
						const tonicUrl = region === 'CA' ? 'https://www.tonicliving.ca' : 'https://www.tonicliving.com';
						pdf.link(padding, footerY, logoWidth, logoHeight, { url: tonicUrl });
					} catch (e) {
						console.log('Could not load footer logo', e);
					}

					const flexGap = 20;
					const sectionY = footerY + 10;

					const addressX = padding + logoWidth + flexGap;
					pdf.setFont('Brown Std Light', 'normal');

					pdf.setFontSize(9);
					pdf.setTextColor(80, 80, 80);
					pdf.text('36 Northline Rd Unit 6,', addressX, sectionY);
					pdf.text('Toronto, Ontario', addressX, sectionY + 12);

					const contactX = addressX + 100;
					pdf.text('416-699-9879', contactX, sectionY);
					pdf.text(`designhelp@tonicliving.com`, contactX, sectionY + 12);

					let socialX = pdfWidth - 120;
					const socialSize = 15;
					const socialSpacing = 25;
					const socialMedia = [
						{ icon: '/Instagram.png', url: 'https://www.instagram.com/tonicliving/' },
						{ icon: '/Facebook.png', url: 'https://www.facebook.com/tonicliving/' },
						{ icon: '/Pinterest.png', url: 'https://www.pinterest.com/tonicliving/' },
					];

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

				const metadata = { moodboards, name, region };
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
			{isDownloading ? 'Downloading...' : 'Download'}
		</Button>
	);
};

export default DownloadButton;
