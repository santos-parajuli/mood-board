import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request) {
	const { imageUrl } = await request.json();
	if (!imageUrl) {
		return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
	}
	try {
		// fetch image from URL
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}
		const arrayBuffer = await response.arrayBuffer();
		const inputBuffer = Buffer.from(arrayBuffer);
		// process: remove only surrounding white background
		const outputBuffer = await sharp(inputBuffer)
			.png()
			.ensureAlpha()
			.toColourspace('rgba')
			.raw()
			.toBuffer({ resolveWithObject: true })
			.then(({ data, info }) => {
				const { width, height, channels } = info;
				const visited = new Uint8Array(width * height);
				const queue = [];
				const isWhite = (r, g, b) => r > 240 && g > 240 && b > 240;
				const markTransparent = (x, y) => {
					const idx = (y * width + x) * channels;
					data[idx + 3] = 0;
				};
				const hasNonWhiteNeighbor = (x, y) => {
					const dirs = [
						[1, 0],
						[-1, 0],
						[0, 1],
						[0, -1],
						[1, 1],
						[-1, -1],
						[1, -1],
						[-1, 1],
					];
					for (const [dx, dy] of dirs) {
						const nx = x + dx;
						const ny = y + dy;
						if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
						const nidx = (ny * width + nx) * channels;
						const r = data[nidx];
						const g = data[nidx + 1];
						const b = data[nidx + 2];
						if (!isWhite(r, g, b)) {
							return true;
						}
					}
					return false;
				};
				const enqueueIfWhite = (x, y) => {
					if (x < 0 || y < 0 || x >= width || y >= height) return;
					const i = y * width + x;
					if (visited[i]) return;
					const idx = i * channels;
					const r = data[idx];
					const g = data[idx + 1];
					const b = data[idx + 2];
					if (isWhite(r, g, b)) {
						visited[i] = 1;
						queue.push({ x, y });
					}
				};
				// enqueue corners
				enqueueIfWhite(0, 0);
				enqueueIfWhite(width - 1, 0);
				enqueueIfWhite(0, height - 1);
				enqueueIfWhite(width - 1, height - 1);
				while (queue.length > 0) {
					const { x, y } = queue.shift();
					// if it has a non-white neighbor, consider it part of content — skip
					if (hasNonWhiteNeighbor(x, y)) {
						continue;
					}
					markTransparent(x, y);
					enqueueIfWhite(x + 1, y);
					enqueueIfWhite(x - 1, y);
					enqueueIfWhite(x, y + 1);
					enqueueIfWhite(x, y - 1);
				}
				// reconstruct
				return sharp(data, { raw: { width, height, channels } })
					.png()
					.toBuffer()
					.then(async (buffer) => {
						const trimmed = await sharp(buffer).trim().toBuffer();
						const trimmedMetadata = await sharp(trimmed).metadata();
						const canvasSize = Math.max(trimmedMetadata.width, trimmedMetadata.height);
						const canvas = sharp({
							create: {
								width: canvasSize,
								height: canvasSize,
								channels: 4,
								background: { r: 0, g: 0, b: 0, alpha: 0 },
							},
						});
						const left = Math.floor((canvasSize - trimmedMetadata.width) / 2);
						const top = Math.floor((canvasSize - trimmedMetadata.height) / 2);
						const final = await canvas
							.composite([{ input: trimmed, left, top }])
							.png()
							.toBuffer();
						return final;
					});
			});
		return new NextResponse(outputBuffer, {
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
