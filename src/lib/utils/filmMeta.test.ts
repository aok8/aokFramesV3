import { describe, it, expect } from 'vitest';
import { filmMeta } from './filmMeta.js';

describe('filmMeta', () => {
	it('reads stock, camera, date and frame from a portfolio URL', () => {
		expect(filmMeta('https://assets.aokframes.com/portfolio/w1920/Portra800_Mamiya6_05_03_24_9.webp')).toEqual({
			stock: 'Portra 800',
			camera: 'Mamiya 6',
			date: '3 May 2024',
			frame: '9',
			bw: false,
			digital: false
		});
	});

	it('handles a second roll number after the stock', () => {
		const m = filmMeta('Trix400_2_BessaR_08_12_24_6.webp');
		expect(m?.stock).toBe('Tri-X 400');
		expect(m?.camera).toBe('Bessa R');
		expect(m?.date).toBe('12 Aug 2024');
		expect(m?.bw).toBe(true);
	});

	it('prettifies stocks and cameras it does not know', () => {
		const m = filmMeta('Superia400_Canonet_02_01_25_3.webp');
		expect(m?.stock).toBe('Superia 400');
		expect(m?.camera).toBe('Canonet');
	});

	it('labels digital camera files as Digital', () => {
		for (const name of ['DSC_9170.jpg', 'https://assets.aokframes.com/temps/DSC_7958.webp', 'R0001798.webp', 'R0003043_SOC.jpg']) {
			const m = filmMeta(name);
			expect(m?.digital).toBe(true);
			expect(m?.stock).toBe('Digital');
			expect(m?.camera).toBeUndefined();
		}
	});

	it('treats anything that is not a valid film name as digital', () => {
		expect(filmMeta('Portra800_Mamiya6_13_03_24_9.webp')?.digital).toBe(true);
	});

	it('returns null only when there is no filename', () => {
		expect(filmMeta('')).toBeNull();
	});
});
