/**
 * Tile positions for the national map: 36 states and the FCT on an 8-column grid,
 * each placed roughly where it sits (north-west top left, south-south bottom middle).
 * Codes are the common two-letter state abbreviations.
 */
export type Tile = { code: string; state: string; col: number; row: number };

export const TILES: Tile[] = [
  { code: "SO", state: "Sokoto", col: 1, row: 0 },
  { code: "ZA", state: "Zamfara", col: 2, row: 0 },
  { code: "KT", state: "Katsina", col: 3, row: 0 },
  { code: "KN", state: "Kano", col: 4, row: 0 },
  { code: "JI", state: "Jigawa", col: 5, row: 0 },
  { code: "YO", state: "Yobe", col: 6, row: 0 },
  { code: "BO", state: "Borno", col: 7, row: 0 },
  { code: "KE", state: "Kebbi", col: 1, row: 1 },
  { code: "NI", state: "Niger", col: 2, row: 1 },
  { code: "KD", state: "Kaduna", col: 3, row: 1 },
  { code: "BA", state: "Bauchi", col: 4, row: 1 },
  { code: "GO", state: "Gombe", col: 5, row: 1 },
  { code: "AD", state: "Adamawa", col: 6, row: 1 },
  { code: "OY", state: "Oyo", col: 0, row: 2 },
  { code: "KW", state: "Kwara", col: 1, row: 2 },
  { code: "FC", state: "Federal Capital Territory", col: 2, row: 2 },
  { code: "NA", state: "Nasarawa", col: 3, row: 2 },
  { code: "PL", state: "Plateau", col: 4, row: 2 },
  { code: "TA", state: "Taraba", col: 5, row: 2 },
  { code: "OG", state: "Ogun", col: 0, row: 3 },
  { code: "OS", state: "Osun", col: 1, row: 3 },
  { code: "EK", state: "Ekiti", col: 2, row: 3 },
  { code: "KO", state: "Kogi", col: 3, row: 3 },
  { code: "BE", state: "Benue", col: 4, row: 3 },
  { code: "LA", state: "Lagos", col: 0, row: 4 },
  { code: "ON", state: "Ondo", col: 1, row: 4 },
  { code: "ED", state: "Edo", col: 2, row: 4 },
  { code: "AN", state: "Anambra", col: 3, row: 4 },
  { code: "EN", state: "Enugu", col: 4, row: 4 },
  { code: "EB", state: "Ebonyi", col: 5, row: 4 },
  { code: "DE", state: "Delta", col: 2, row: 5 },
  { code: "IM", state: "Imo", col: 3, row: 5 },
  { code: "AB", state: "Abia", col: 4, row: 5 },
  { code: "CR", state: "Cross River", col: 5, row: 5 },
  { code: "BY", state: "Bayelsa", col: 2, row: 6 },
  { code: "RI", state: "Rivers", col: 3, row: 6 },
  { code: "AK", state: "Akwa Ibom", col: 4, row: 6 },
];

/** URL slug for a state page: /state/akwa-ibom, /state/fct. */
export const stateSlug = (state: string) => (state === "Federal Capital Territory" ? "fct" : state.toLowerCase().replace(/\s+/g, "-"));
export const tileBySlug = (slug: string) => TILES.find((t) => stateSlug(t.state) === slug.toLowerCase());

export const tileByCode =(code: string | undefined) => (code ? TILES.find((t) => t.code === code.toUpperCase()) : undefined);
export const stateLabel = (state: string) => (state === "Federal Capital Territory" ? state : `${state} State`);
