'use client';

import { useEffect, useState } from 'react';

export default function XLSXDataFetcher({ onDataLoaded }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch('/api/xlsx');
				if (!response.ok) {
					throw new Error('Failed to fetch XLSX data');
				}
				const result = await response.json();
				onDataLoaded(result.data);
			} catch (error) {
				console.error('Error fetching XLSX data:', error);
				setError(`Failed to fetch and process XLSX data: ${error.message}`);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);
	return (
		<div className='p-4 border-b'>
			{loading && <p>Loading XLSX Data...</p>}
			{error && <p className='text-red-500'>{error}</p>}
		</div>
	);
}
