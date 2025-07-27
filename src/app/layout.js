import './globals.css';

import { Nunito, Nunito_Sans } from 'next/font/google';

import { Toaster } from 'sonner';

const nunito_Sans = Nunito_Sans({
	variable: '--font-nunito-sans',
	subsets: ['latin'],
});

const nunito = Nunito({
	variable: '--font-nunito',
	subsets: ['latin'],
});

export const metadata = {
	title: 'Pillow Mood Board – Design Your Perfect Pillow Combinations | Tonic Living',
	description: 'Create stunning pillow combinations with our interactive Mood Board. Experiment with Tonic Living’s beautiful pillows and visualize your dream home decor setup in real time.',
	keywords: 'mood board, pillow combinations, pillow mood board, interactive pillow designer, cushion styling, home decor, interior design, Tonic Living',
	authors: [
		{ name: 'Tonic Living', url: 'https.www.tonicliving.ca' },
		{ name: 'Santosh Parajuli', url: 'https://siwani.com.np' },
	],
	creator: 'Tonic Living & Santosh Parajuli',
	publisher: 'Tonic Living',
	metadataBase: new URL('https://moodboard.siwani.com.np'),
	robots: {
		index: true,
		follow: true,
		nocache: false,
	},
	alternates: {
		canonical: 'https://moodboard.siwani.com.np',
		languages: {
			'en-US': 'https://moodboard.siwani.com.np',
		},
	},
	openGraph: {
		title: 'Pillow Mood Board – Design Your Perfect Pillow Combinations | Tonic Living',
		description: 'Play with endless pillow combinations using our interactive Mood Board for Tonic Living. Perfect your home styling with ease.',
		url: 'https://moodboard.siwani.com.np',
		siteName: 'Tonic Living Pillow Mood Board',
		locale: 'en_US',
		type: 'website',
		emails: ['info@tonicliving.ca'],
		countryName: 'Canada',
	},
	category: 'Home & Garden > Home Decor > Cushions & Covers',
	applicationName: 'Tonic Living Mood Board',
	other: {
		facebookPage: 'https://www.facebook.com/tonicliving/',
		instagramPage: 'https://www.instagram.com/tonicliving/',
		pinterestPage: 'https://ca.pinterest.com/tonicliving/',
	},
};

export default function RootLayout({ children }) {
	return (
		<html lang='en'>
			<body className={`${nunito_Sans.variable} ${nunito.variable} antialiased`}>
				<Toaster />
				{children}
			</body>
		</html>
	);
}
