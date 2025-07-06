import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const fixUrl = (path, baseUrl) => {
    if (!path) return '';
    if (path.startsWith('//')) {
        return 'https:' + path;
    }
    if (path.startsWith('/')) {
        try {
            const origin = new URL(baseUrl).origin;
            return origin + path;
        } catch (e) {
            return path; // if baseUrl is invalid
        }
    }
    return path;
}

export async function POST(request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1.product-title').text().trim();
    const image = fixUrl($('.main-image img').first().attr('src'), url);

    const goesWellWith = [];
    const youMayAlsoLike = [];

    // Scrape "Goes Well With" section
    $('h2.hometitle:has(span:contains("Goes Well With"))').each((i, el) => {
        const productGrid = $(el).closest('.collection-slider-row').find('.product-grid').first();
        productGrid.find('.product-block').each((j, productEl) => {
          const productBlock = $(productEl);
          const productTitle = productBlock.find('.product-block__title').text().trim();
          const productImage = fixUrl(productBlock.find('.product-block__image--primary img').attr('src'), url);
          const productUrl = fixUrl(productBlock.find('a.product-link').attr('href'), url);
          if (productTitle && productImage && productUrl) {
            goesWellWith.push({
                title: productTitle,
                image: productImage,
                url: productUrl,
            });
          }
        });
    });

    // Scrape "You May Also Like" section
    $('h2.hometitle:has(span:contains("You May Also Like"))').each((i, el) => {
        const productGrid = $(el).closest('.collection-slider-row').find('.product-grid').first();
        productGrid.find('.product-block').each((j, productEl) => {
          const productBlock = $(productEl);
          const productTitle = productBlock.find('.product-block__title').text().trim();
          const productImage = fixUrl(productBlock.find('.product-block__image--primary img').attr('src'), url);
          const productUrl = fixUrl(productBlock.find('a.product-link').attr('href'), url);
          if (productTitle && productImage && productUrl) {
            youMayAlsoLike.push({
                title: productTitle,
                image: productImage,
                url: productUrl,
            });
          }
        });
    });

	const mainProduct = {
		title,
		image,
		url,
		goesWellWith,
		youMayAlsoLike,
	};

	return NextResponse.json({ mainProduct });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to scrape the website' }, { status: 500 });
  }
}