'use client';

import { useEffect, useRef, useState } from 'react';

import Header from '../components/layout/Header';
import MainContent from '../components/layout/MainContent';
import PillowPicker from '../components/gallery/PillowPicker';
import XLSXDataFetcher from '../components/XLSXDataFetcher';
import useCanvasStore from '../store/canvasStore';
import useMoodboardStore from '../store/moodboardStore';

export default function Home() {
	const { setAllXlsxData, moodboards, activeMoodboardId, selectMoodboard } = useMoodboardStore();
	const { setCanvasRef } = useCanvasStore();

	const canvasRef = useRef(null);

	useEffect(() => {
		setCanvasRef(canvasRef);
	}, [setCanvasRef]);

	useEffect(() => {
		if (!activeMoodboardId && moodboards.length > 0) {
			selectMoodboard(moodboards[0].id);
		}
	}, [activeMoodboardId, moodboards, selectMoodboard]);

	const handleDataLoaded = (loadedData) => {
		setAllXlsxData(loadedData);
	};

	return (
		<main className='flex flex-col h-screen w-full p-4'>
			<Header />
			<XLSXDataFetcher onDataLoaded={handleDataLoaded} />
			<PillowPicker />
			<MainContent ref={canvasRef} />
		</main>
	);
}
