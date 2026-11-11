/**
 * Film data from a portfolio filename.
 *
 * Portfolio scans are named Stock_Camera_MM_DD_YY_Frame, e.g. "Portra800_Mamiya6_05_03_24_9".
 * A second roll of the same stock on the same day carries a roll number after the stock:
 * "Trix400_2_BessaR_08_12_24_6". In a Works folder a number comes first to set the photo's order:
 * "1_Trix400_BessaR_08_12_24_20".
 *
 * Anything that isn't a film scan is digital: camera files such as "DSC_9170", "R0001798" or
 * "R0003043_SOC". Which digital camera doesn't matter; those are simply labelled "Digital".
 */

export interface FilmMeta {
	/** Film stock, or "Digital" */
	stock: string;
	camera?: string;
	/** e.g. "3 May 2024" */
	date?: string;
	frame?: string;
	/** black-and-white stock: printed on a silver base instead of amber */
	bw: boolean;
	digital: boolean;
}

const DIGITAL: FilmMeta = { stock: 'Digital', bw: false, digital: true };

const STOCKS: Record<string, string> = {
	Acros100: 'Acros 100',
	Acrosii: 'Acros II',
	Cinestill800t: 'CineStill 800T',
	Ektar100: 'Ektar 100',
	Gold200: 'Gold 200',
	Lomo800: 'Lomo 800',
	Portra160: 'Portra 160',
	Portra400: 'Portra 400',
	Portra800: 'Portra 800',
	Provia: 'Provia 100F',
	Trix400: 'Tri-X 400',
	Hp5: 'HP5 400',
	Hp5400: 'HP5 400'
};

const BW_STOCKS = new Set(['Acros100', 'Acrosii', 'Trix400', 'Hp5', 'Hp5400']);

const CAMERAS: Record<string, string> = {
	Mamiya6: 'Mamiya 6',
	MamiyaSix: 'Mamiya 6',
	Bessa: 'Bessa R',
	BessaR: 'Bessa R',
	R4m: 'Bessa R4M',
	F100: 'Nikon F100'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PATTERN = /^([A-Za-z]+\d*[A-Za-z]?)(?:_\d)?_([A-Za-z0-9]+)_(\d{2})_(\d{2})_(\d{2})_(\d+)$/;

/** Split "Cinestill800t" into "Cinestill 800t" for stocks we have no display name for. */
function prettify(raw: string): string {
	return raw.replace(/([A-Za-z])(\d)/, '$1 $2');
}

/**
 * Display name for a camera code. Voigtländer Bessa R-series models are matched as a family, so
 * "BessaR4m", "BessaR3m", "R4m" or "R2a" all read as "Bessa R4M", "Bessa R3M", "Bessa R2A".
 */
function cameraName(code: string): string {
	if (CAMERAS[code]) return CAMERAS[code];
	const bessa = /^(?:Bessa)?R(\d)([a-z]?)$/i.exec(code);
	if (bessa) return `Bessa R${bessa[1]}${bessa[2].toUpperCase()}`;
	return prettify(code);
}

/** The bare filename: no folders, extension or leading order number. */
function baseName(urlOrName: string): string {
	const last = urlOrName.split('/').pop() ?? '';
	let file = last;
	try {
		file = decodeURIComponent(last);
	} catch {
		// a stray % in a filename: use it as written
	}
	return file.replace(/\.[a-z0-9]+$/i, '').replace(/^\d+_(?=[A-Za-z])/, '');
}

export function filmMeta(urlOrName: string): FilmMeta | null {
	const file = baseName(urlOrName);
	if (!file) return null;
	const m = PATTERN.exec(file);
	if (!m) return DIGITAL;
	const [, stockKey, cameraKey, mm, dd, yy, frame] = m;
	const month = Number(mm);
	if (month < 1 || month > 12) return DIGITAL;
	return {
		stock: STOCKS[stockKey] ?? prettify(stockKey),
		camera: cameraName(cameraKey),
		date: `${Number(dd)} ${MONTHS[month - 1]} 20${yy}`,
		frame,
		bw: BW_STOCKS.has(stockKey),
		digital: false
	};
}

export interface SeriesFilm {
	film?: string;
	camera?: string;
	tags?: string[];
}

/**
 * Film data for a photo in a Works series. The photo's own filename wins. A file named only by
 * number ("4.webp") falls back to what the series says about itself: its `film` and `camera`
 * frontmatter, then its tags.
 */
export function workPhotoMeta(src: string, series: SeriesFilm): FilmMeta {
	const file = baseName(src);
	const own = filmMeta(src);
	if (own && (!own.digital || /^(DSC|R\d{5,})/i.test(file))) return own;
	return seriesMeta(series);
}

/** What a Works series says about itself. No film stock and no "Film" tag means digital. */
export function seriesMeta({ film, camera, tags = [] }: SeriesFilm): FilmMeta {
	const has = (tag: string) => tags.some((t) => t.toLowerCase() === tag.toLowerCase());
	if (!film && !has('Film')) return DIGITAL;
	const bw = has('B&W') || Object.entries(STOCKS).some(([key, name]) => name === film && BW_STOCKS.has(key));
	return { stock: film ?? (bw ? 'B&W Film' : 'Film'), camera, bw, digital: false };
}
