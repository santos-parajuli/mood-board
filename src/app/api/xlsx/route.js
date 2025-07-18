import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const EXCEL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSrAvkUkOtS1xdMvd-Kyw5Tyz5MatWmsIBMpc5n_8TmdL31zffsWfwc5qv-wlUKZzvYnz42NqjCcj9C/pub?output=xlsx';

export async function GET() {
  try {
    const response = await fetch(EXCEL_URL);
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    return NextResponse.json({ data: jsonData });
  } catch (error) {
    console.error('Error processing XLSX file:', error);
    return NextResponse.json({ error: 'Failed to process XLSX file' }, { status: 500 });
  }
}