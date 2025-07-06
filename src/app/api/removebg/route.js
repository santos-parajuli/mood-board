import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req) {
	try {
		const { imageUrl } = await req.json();

		if (!imageUrl) {
			return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
		}

		// fetch image
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}

		const inputBuffer = Buffer.from(await response.arrayBuffer());

		// process with sharp to raw RGBA
		const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

		const threshold = 250;
		const newData = Buffer.from(data);

		// step 1: make white pixels transparent
		for (let i = 0; i < newData.length; i += 4) {
			const r = newData[i];
			const g = newData[i + 1];
			const b = newData[i + 2];
			if (r >= threshold && g >= threshold && b >= threshold) {
				newData[i + 3] = 0;
			}
		}

		// step 2: create transparent PNG from updated pixels
		const transparentBuffer = await sharp(newData, {
			raw: {
				width: info.width,
				height: info.height,
				channels: 4,
			},
		})
			.png()
			.toBuffer();

		// step 3: trim (crop) to bounding box of visible pixels
		const trimmedBuffer = await sharp(transparentBuffer).trim().toBuffer();
		const trimmedMetadata = await sharp(trimmedBuffer).metadata();

		// step 4: center on square canvas
		const canvasSize = Math.max(trimmedMetadata.width, trimmedMetadata.height);

		const finalBuffer = await sharp({
			create: {
				width: canvasSize,
				height: canvasSize,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			},
		})
			.composite([
				{
					input: trimmedBuffer,
					left: Math.floor((canvasSize - trimmedMetadata.width) / 2),
					top: Math.floor((canvasSize - trimmedMetadata.height) / 2),
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
		return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
	}
}
