import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req) {
	try {
		const { imageUrl, mode = 'auto', padding = 20 } = await req.json();

		if (!imageUrl) {
			return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
		}

		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}

		const inputBuffer = Buffer.from(await response.arrayBuffer());

		// Decode image to raw RGBA pixels
		const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

		const newData = Buffer.from(data);

		// Step 1: Determine dynamic threshold for white removal
		let threshold = 250;
		if (mode === 'auto') {
			let totalBrightness = 0,
				count = 0;

			for (let i = 0; i < data.length; i += 16 * 4) {
				const r = data[i],
					g = data[i + 1],
					b = data[i + 2];
				const brightness = (r + g + b) / 3;
				totalBrightness += brightness;
				count++;
			}

			const avgBrightness = totalBrightness / count;
			threshold = avgBrightness > 222 ? 250 : avgBrightness > 200 ? 240 : avgBrightness > 180 ? 230 : avgBrightness > 160 ? 220 : 210;
		}

		// Step 2: Make white pixels transparent based on threshold
		for (let i = 0; i < newData.length; i += 4) {
			const r = newData[i],
				g = newData[i + 1],
				b = newData[i + 2];
			if (r >= threshold && g >= threshold && b >= threshold) {
				newData[i + 3] = 0; // Set alpha to 0 (transparent)
			}
		}

		// Step 3: Find bounding box of opaque (non-transparent) pixels
		let left = info.width,
			right = 0,
			top = info.height,
			bottom = 0;

		for (let y = 0; y < info.height; y++) {
			for (let x = 0; x < info.width; x++) {
				const alphaIndex = (y * info.width + x) * 4 + 3;
				if (newData[alphaIndex] > 0) {
					// visible pixel
					if (x < left) left = x;
					if (x > right) right = x;
					if (y < top) top = y;
					if (y > bottom) bottom = y;
				}
			}
		}

		// No visible pixels case
		if (right < left || bottom < top) {
			throw new Error('No visible pixels found.');
		}

		// Step 4: Extract bounding box region from raw data
		const croppedBuffer = await sharp(newData, {
			raw: {
				width: info.width,
				height: info.height,
				channels: 4,
			},
		})
			.extract({
				left,
				top,
				width: right - left + 1,
				height: bottom - top + 1,
			})
			.png()
			.toBuffer();

		const croppedMeta = await sharp(croppedBuffer).metadata();

		// Step 5: Create square canvas with padding, center the cropped image
		const canvasSize = Math.max(croppedMeta.width + 2 * padding, croppedMeta.height + 2 * padding);

		const finalBuffer = await sharp({
			create: {
				width: canvasSize,
				height: canvasSize,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent background
			},
		})
			.composite([
				{
					input: croppedBuffer,
					left: Math.floor((canvasSize - croppedMeta.width) / 2),
					top: Math.floor((canvasSize - croppedMeta.height) / 2),
				},
			])
			.png()
			.toBuffer();

		return new NextResponse(finalBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'image/png',
				'Content-Disposition': 'inline; filename="output.png"',
			},
		});
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: err.message || 'Failed to process image' }, { status: 500 });
	}
}
