import { NextResponse } from 'next/server';
import { google } from 'googleapis';

let jwtClient;

try {
	// Decode base64 JSON from environment
	const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 ? JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')) : null;

	if (!keyJson) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_BASE64 env variable');

	jwtClient = new google.auth.JWT({
		email: keyJson.client_email,
		key: keyJson.private_key,
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
	});
} catch (err) {
	console.error('Failed to initialize JWT client:', err);
}

export async function GET() {
	try {
		if (!jwtClient) {
			throw new Error('JWT client not initialized. Service account key loading failed.');
		}
		await jwtClient.authorize();
		const sheets = google.sheets({ version: 'v4', auth: jwtClient });

		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: process.env.GOOGLE_SHEET_ID,
			range: 'Sheet1', // Assumes you want to read from Sheet1
		});

		const values = response.data.values;
		if (!values || values.length === 0) {
			return NextResponse.json({ data: [] });
		}

		const headers = values[0];
		const rows = values.slice(1);

		const jsonData = rows.map((row) => {
			const obj = {};
			headers.forEach((header, index) => {
				obj[header] = row[index];
			});
			return obj;
		});

		return NextResponse.json({ data: jsonData });
	} catch (error) {
		console.error('Error reading from Google Sheet:', error);
		return NextResponse.json({ error: 'Failed to read from Google Sheet', details: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		if (!jwtClient) {
			throw new Error('JWT client not initialized. Service account key loading failed.');
		}
		await jwtClient.authorize();
		const sheets = google.sheets({ version: 'v4', auth: jwtClient });
		const newData = await request.json();

		const formatRelatedItems = (items) => {
			if (!items || items.length === 0) return '';
			return items.map((item) => `${item.title} (${item.url})`).join('; ');
		};
		const values = [
			[
				newData.mainProduct.title,
				newData.mainProduct.image,
				newData.mainProduct.url,
				newData.mainProduct.withInsertId, // With_Insert_ID
				newData.mainProduct.withoutInsertId, // With_Insert_ID
				formatRelatedItems(newData.mainProduct.goesWellWith),
				formatRelatedItems(newData.mainProduct.youMayAlsoLike),
			],
		];
		console.log(values);
		const response = await sheets.spreadsheets.values.append({
			spreadsheetId: process.env.GOOGLE_SHEET_ID,
			range: 'Sheet1!A1',
			valueInputOption: 'USER_ENTERED',
			resource: {
				values,
			},
		});
		return NextResponse.json({ success: true, data: response.data });
	} catch (error) {
		console.error('Error writing to Google Sheet:', error);
		return NextResponse.json({ error: 'Failed to write to Google Sheet', details: error.message }, { status: 500 });
	}
}
