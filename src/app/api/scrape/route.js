import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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
    const image = $('.main-image img').first().attr('src') || '';

    const goesWellWith = [];
    const youMayAlsoLike = [];

    // Scrape "Goes Well With" section
    $('h2.hometitle:has(span:contains("Goes Well With"))').each((i, el) => {
        const productGrid = $(el).closest('.collection-slider-row').find('.product-grid').first();
        productGrid.find('.product-block').each((j, productEl) => {
          const productBlock = $(productEl);
          const productTitle = productBlock.find('.product-block__title').text().trim();
          const productImage = productBlock.find('.product-block__image--primary img').attr('src') || '';
          const productUrl = 'https://www.tonicliving.com' + productBlock.find('a.product-link').attr('href');
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
          const productImage = productBlock.find('.product-block__image--primary img').attr('src') || '';
          const productUrl = 'https://www.tonicliving.com' + productBlock.find('a.product-link').attr('href');
          if (productTitle && productImage && productUrl) {
            youMayAlsoLike.push({
                title: productTitle,
                image: productImage,
                url: productUrl,
            });
          }
        });
    });

    return NextResponse.json({ title, image, goesWellWith, youMayAlsoLike });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to scrape the website' }, { status: 500 });
  }
}