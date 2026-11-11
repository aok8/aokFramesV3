import { describe, it, expect } from 'vitest';
import { filmMeta, seriesMeta, workPhotoMeta } from './filmMeta.js';

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

	it('names Bessa R-series models correctly', () => {
		expect(filmMeta('7_Portra800_BessaR4m_04_13_25_16.jpg')?.camera).toBe('Bessa R4M');
		expect(filmMeta('Trix400_BessaR3m_04_13_25_2.webp')?.camera).toBe('Bessa R3M');
		expect(filmMeta('Portra800_R4m_01_03_25_11.webp')?.camera).toBe('Bessa R4M');
		expect(filmMeta('Trix400_BessaR_08_12_24_20.webp')?.camera).toBe('Bessa R');
	});

	it('splits brand and model for cameras written together', () => {
		expect(filmMeta('4_Portra800_RicohR1_09_11_23_22.webp')?.camera).toBe('Ricoh R1');
		expect(filmMeta('Portra400_NikonFM2_01_02_24_3.webp')?.camera).toBe('Nikon FM2');
		expect(filmMeta('Portra400_Mamiya6_01_02_24_3.webp')?.camera).toBe('Mamiya 6');
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

	describe('Works photos', () => {
		const series = { film: 'Tri-X 400', camera: 'Bessa R', tags: ['Film', 'B&W'] };

		it('reads film data after the order number', () => {
			const m = workPhotoMeta('https://assets.aokframes.com/works/SF/1_Trix400_BessaR_08_12_24_20.webp', {});
			expect(m).toMatchObject({ stock: 'Tri-X 400', camera: 'Bessa R', date: '12 Aug 2024', frame: '20', digital: false });
		});

		it('lets a photo override its series', () => {
			expect(workPhotoMeta('3_Portra800_F100_09_14_24_6.webp', series).stock).toBe('Portra 800');
		});

		it('labels a digital file in a film series as digital', () => {
			expect(workPhotoMeta('2_DSC_9170.webp', series).digital).toBe(true);
			expect(workPhotoMeta('R0003043_SOC.webp', series).digital).toBe(true);
		});

		it('falls back to the series for number-only files', () => {
			expect(workPhotoMeta('4.webp', series)).toMatchObject({ stock: 'Tri-X 400', camera: 'Bessa R', bw: true });
		});

		it('uses tags when the series has no film field', () => {
			expect(workPhotoMeta('4.webp', { tags: ['Film', 'Street'] })).toMatchObject({ stock: 'Film', bw: false, digital: false });
			expect(workPhotoMeta('4.webp', { tags: ['Film', 'B&W'] })).toMatchObject({ stock: 'B&W Film', bw: true });
		});

		it('calls a series digital when nothing says film', () => {
			expect(seriesMeta({ tags: ['Street'] }).digital).toBe(true);
		});
	});
});
