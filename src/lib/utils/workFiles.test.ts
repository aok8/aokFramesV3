import { describe, it, expect } from 'vitest';
import { altFromFilename, compareByOrder, orderOf, resolveCoverFile } from './workFiles.js';

describe('workFiles', () => {
	it('reads the order from plain and film-named files', () => {
		expect(orderOf('7.webp')).toBe(7);
		expect(orderOf('12_Trix400_BessaR_08_12_24_20.webp')).toBe(12);
		expect(orderOf('DSC_9170.webp')).toBe(Infinity);
	});

	it('sorts by number instead of alphabetically, with unnumbered files last', () => {
		const files = ['10.webp', 'DSC_1.webp', '2_Trix400_BessaR_08_12_24_20.webp', '1.webp'];
		expect(files.sort(compareByOrder)).toEqual([
			'1.webp',
			'2_Trix400_BessaR_08_12_24_20.webp',
			'10.webp',
			'DSC_1.webp'
		]);
	});

	describe('resolveCoverFile', () => {
		const files = ['1.webp', '5_Trix400_BessaR_08_12_24_20.webp', '15_Portra800_F100_09_14_24_6.webp'];

		it('uses an exact filename, with or without a leading slash', () => {
			expect(resolveCoverFile('5_Trix400_BessaR_08_12_24_20.webp', files)).toBe('5_Trix400_BessaR_08_12_24_20.webp');
			expect(resolveCoverFile('/1.webp', files)).toBe('1.webp');
		});

		it('finds a renamed photo from its old number', () => {
			expect(resolveCoverFile('5.webp', files)).toBe('5_Trix400_BessaR_08_12_24_20.webp');
			expect(resolveCoverFile('15.webp', files)).toBe('15_Portra800_F100_09_14_24_6.webp');
		});

		it('leaves a cover it cannot find unchanged', () => {
			expect(resolveCoverFile('9.webp', files)).toBe('9.webp');
		});
	});

	it('keeps alt text only for names written for people', () => {
		expect(altFromFilename('Sunset over the bay.webp')).toBe('Sunset over the bay');
		expect(altFromFilename('3.webp')).toBe('');
		expect(altFromFilename('1_Trix400_BessaR_08_12_24_20.webp')).toBe('');
		expect(altFromFilename('Trix400_BessaR_08_12_24_20.webp')).toBe('');
		expect(altFromFilename('DSC_9170.webp')).toBe('');
		expect(altFromFilename('R0003043_SOC.webp')).toBe('');
	});
});
