/**
 * Filename rules for photos in a Works folder.
 *
 * The leading number sets the order a photo appears in: "1.webp", or with film data after it,
 * "1_Trix400_BessaR_08_12_24_20.webp".
 */

/** The photo's position from its leading number, or Infinity when it has none. */
export function orderOf(filename: string): number {
	const m = /^(\d+)(?:[_.-]|$)/.exec(filename);
	return m ? Number(m[1]) : Infinity;
}

/**
 * Sort filenames by their leading number. Storage lists names alphabetically, which puts
 * "10.webp" straight after "1.webp".
 */
export function compareByOrder(a: string, b: string): number {
	const diff = orderOf(a) - orderOf(b);
	if (diff && Number.isFinite(diff)) return diff;
	if (orderOf(a) !== orderOf(b)) return orderOf(a) === Infinity ? 1 : -1;
	return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * The file a series' `coverImage` refers to. An exact filename always wins. A plain number
 * ("5.webp") also finds its renamed photo ("5_Trix400_BessaR_08_12_24_20.webp"), so renaming a
 * folder doesn't break its cover.
 */
export function resolveCoverFile(coverImage: string, files: string[]): string {
	const wanted = coverImage.replace(/^\/+/, '');
	if (files.includes(wanted)) return wanted;
	const numbered = /^(\d+)(?:\.[a-z0-9]+)?$/i.exec(wanted);
	if (numbered) {
		const match = files.find((file) => orderOf(file) === Number(numbered[1]));
		if (match) return match;
	}
	return wanted;
}

/**
 * Alt text from a filename, but only when the name is written for people. Order numbers and
 * film or camera codes would just be noise to a screen reader.
 */
export function altFromFilename(filename: string): string {
	const name = filename.replace(/\.[a-z0-9]+$/i, '');
	if (Number.isFinite(orderOf(filename))) return '';
	if (/^(DSC|R\d{5,})/i.test(name) || /_\d{2}_\d{2}_\d{2}_\d+$/.test(name)) return '';
	return name;
}
