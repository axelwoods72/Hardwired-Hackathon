// Everything the food finder knows about food lives in this file:
// the question flowchart the player walks through, and the restaurant search.
//
// searchRestaurants() serves mock Melbourne CBD data until the Google Places
// API is wired in (stage 5). The mock branch stays forever as the offline
// fallback so the demo survives dead venue wifi.

const MELBOURNE_CBD = { lat: -37.8136, lng: 144.9631 };

// The flowchart. Each node is a question; each option carries the filters it
// adds to the search and the id of the next node (null = quiz over, go fight).
// The `type` values are real Google Places API type strings, so stage 5 can
// pass them straight through.
const QUIZ = {
    start: {
        round: 1,
        question: 'How hungry are you?',
        options: [
            { label: 'Peckish',  caption: 'quick bite',   filters: { radius: 600 },  next: 'cuisine' },
            { label: 'Hungry',   caption: 'proper meal',  filters: { radius: 1200 }, next: 'cuisine' },
            { label: 'Starving', caption: 'no limits',    filters: { radius: 2500 }, next: 'cuisine' },
        ],
    },
    cuisine: {
        round: 2,
        question: 'Choose your fighter',
        options: [
            { label: 'Ramen',       caption: 'noodle master',  filters: { type: 'ramen_restaurant' },     next: 'budget' },
            { label: 'Dumplings',   caption: 'steam power',    filters: { type: 'chinese_restaurant' },   next: 'budget' },
            { label: 'Pizza',       caption: 'wood fire',      filters: { type: 'pizza_restaurant' },     next: 'budget' },
            { label: 'Burgers',     caption: 'heavy hitter',   filters: { type: 'hamburger_restaurant' }, next: 'budget' },
            { label: 'Souvlaki',    caption: 'greek strength', filters: { type: 'greek_restaurant' },     next: 'budget' },
            { label: 'Bar',         caption: 'liquid courage', filters: { type: 'bar' },                  next: 'budget' },
            { label: 'Cafe',        caption: 'caffeine combo', filters: { type: 'cafe' },                 next: 'budget' },
            { label: 'Dessert',     caption: 'sweet finish',   filters: { type: 'dessert_shop' },         next: 'budget' },
            { label: 'Surprise me', caption: 'random select',  filters: { type: 'restaurant' },           next: 'budget' },
        ],
    },
    budget: {
        round: 3,
        question: 'Pick your power level',
        options: [
            { label: 'Cheap eats', caption: '$',    filters: { maxPrice: 1 }, next: null },
            { label: 'Solid',      caption: '$$',   filters: { maxPrice: 2 }, next: null },
            { label: 'Baller',     caption: '$$$+', filters: { maxPrice: 4 }, next: null },
        ],
    },
};

const QUIZ_START_NODE = 'start';

// Mock data: real, well-known Melbourne CBD spots so the demo feels genuine.
// Coordinates are approximate; ratings/prices indicative. Replaced by live
// Google data in stage 5, kept as the offline fallback.
const MOCK_PLACES = [
    { id: 'gensuke',    name: 'Hakata Gensuke',      type: 'ramen_restaurant',     rating: 4.4, ratingCount: 3200, price: 2, address: '45 Russell St',        lat: -37.8129, lng: 144.9677 },
    { id: 'shujinko',   name: 'Shujinko Ramen',      type: 'ramen_restaurant',     rating: 4.1, ratingCount: 2100, price: 2, address: '225 Russell St',       lat: -37.8107, lng: 144.9672 },
    { id: 'shandong',   name: 'ShanDong MaMa',       type: 'chinese_restaurant',   rating: 4.4, ratingCount: 1800, price: 1, address: 'Mid City Arcade, Bourke St', lat: -37.8123, lng: 144.9668 },
    { id: 'hutong',     name: 'HuTong Dumpling Bar', type: 'chinese_restaurant',   rating: 4.0, ratingCount: 2900, price: 2, address: '14-16 Market Ln',      lat: -37.8115, lng: 144.9700 },
    { id: 'dintaifung', name: 'Din Tai Fung',        type: 'chinese_restaurant',   rating: 4.2, ratingCount: 2400, price: 3, address: 'Emporium, Lonsdale St', lat: -37.8117, lng: 144.9637 },
    { id: 'plus39',     name: '+39 Pizzeria',        type: 'pizza_restaurant',     rating: 4.3, ratingCount: 1600, price: 2, address: '362 Little Bourke St', lat: -37.8135, lng: 144.9611 },
    { id: 'pizzax3',    name: 'Pizza Pizza Pizza',   type: 'pizza_restaurant',     rating: 4.5, ratingCount: 900,  price: 1, address: 'Tattersalls Ln',       lat: -37.8110, lng: 144.9658 },
    { id: 'gradi',      name: '400 Gradi Crown',     type: 'pizza_restaurant',     rating: 4.2, ratingCount: 2000, price: 3, address: 'Crown Riverwalk',      lat: -37.8225, lng: 144.9580 },
    { id: 'stacks',     name: 'Royal Stacks',        type: 'hamburger_restaurant', rating: 4.3, ratingCount: 1500, price: 1, address: '470 Collins St',       lat: -37.8172, lng: 144.9585 },
    { id: 'eightbit',   name: '8bit Burgers',        type: 'hamburger_restaurant', rating: 4.2, ratingCount: 1900, price: 1, address: '197 Elizabeth St',     lat: -37.8127, lng: 144.9630 },
    { id: 'butchers',   name: 'Butchers Diner',      type: 'hamburger_restaurant', rating: 4.3, ratingCount: 1100, price: 2, address: '10 Bourke St',         lat: -37.8112, lng: 144.9722 },
    { id: 'stalactites',name: 'Stalactites',         type: 'greek_restaurant',     rating: 4.2, ratingCount: 5200, price: 2, address: '177-183 Lonsdale St',  lat: -37.8109, lng: 144.9662 },
    { id: 'tsindos',    name: 'Tsindos',             type: 'greek_restaurant',     rating: 4.3, ratingCount: 1300, price: 2, address: '197 Lonsdale St',      lat: -37.8109, lng: 144.9656 },
    { id: 'chinchin',   name: 'Chin Chin',           type: 'restaurant',           rating: 4.3, ratingCount: 6800, price: 3, address: '125 Flinders Ln',      lat: -37.8156, lng: 144.9700 },
    { id: 'movida',     name: 'MoVida',              type: 'restaurant',           rating: 4.4, ratingCount: 3900, price: 3, address: '1 Hosier Ln',          lat: -37.8163, lng: 144.9691 },
    { id: 'higherground', name: 'Higher Ground',     type: 'restaurant',           rating: 4.3, ratingCount: 4100, price: 2, address: '650 Little Bourke St', lat: -37.8148, lng: 144.9539 },
    { id: 'heartbreaker', name: 'Heartbreaker',      type: 'bar',                  rating: 4.4, ratingCount: 1200, price: 2, address: '234 Russell St',       lat: -37.8106, lng: 144.9678 },
    { id: 'section8',     name: 'Section 8',         type: 'bar',                  rating: 4.3, ratingCount: 1500, price: 2, address: '27 Tattersalls Ln',     lat: -37.8113, lng: 144.9660 },
    { id: 'baba',         name: 'Brother Baba Budan', type: 'cafe',                rating: 4.5, ratingCount: 2600, price: 1, address: '359 Little Bourke St', lat: -37.8134, lng: 144.9614 },
    { id: 'patricia',     name: 'Patricia Coffee Brewers', type: 'cafe',           rating: 4.6, ratingCount: 1800, price: 2, address: 'Little Bourke & Little William St', lat: -37.8148, lng: 144.9575 },
    { id: 'kokoblack',    name: 'Koko Black',        type: 'dessert_shop',         rating: 4.5, ratingCount: 1400, price: 2, address: 'Royal Arcade, 335 Bourke St', lat: -37.8135, lng: 144.9640 },
    { id: 'n2gelato',     name: 'N2 Extreme Gelato', type: 'dessert_shop',         rating: 4.5, ratingCount: 900,  price: 1, address: 'Melbourne Central',     lat: -37.8103, lng: 144.9628 },
];

function distanceMeters(a, b) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Where is the player? Real geolocation when the phone allows it, Melbourne
// CBD when it doesn't. Answer is cached so we only ever prompt once, and the
// race guarantees a demo never stalls more than ~3.5s waiting for a fix.
let cachedCenter = null;

async function getSearchCenter() {
    if (cachedCenter) return cachedCenter;
    try {
        const pos = await Promise.race([
            new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
                res, rej, { timeout: 3000, maximumAge: 600000 })),
            new Promise((_, rej) => setTimeout(() => rej(new Error('geo timeout')), 3500)),
        ]);
        cachedCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
        cachedCenter = MELBOURNE_CBD;
    }
    return cachedCenter;
}

// The one entry point the UI calls. Tries live Google Places first; ANY
// failure (offline, key not activated, quota) silently falls back to the mock
// data above, so the demo can never die on stage.
//
// A search must never come back empty just because the player is standing in
// the wrong suburb: if the chosen radius finds nothing, widen the net (2.5km,
// then 6km) before giving up, and as a last resort serve the mock list with
// honest straight-line distances.
async function searchRestaurants(filters) {
    const center = await getSearchCenter();
    try {
        const attempts = [
            ...[...new Set([filters.radius ?? 1200, 2500, 6000])].map(radius => ({ ...filters, radius })),
            { ...filters, radius: 6000, maxPrice: 4 },    // last rung: drop the budget cap
        ];
        for (const attempt of attempts) {
            const found = await searchGooglePlaces(attempt, center);
            if (found.length) return found;
        }
        return searchMockPlaces({ type: filters.type, radius: Infinity }, center);
    } catch (err) {
        console.warn('Google Places unavailable — using mock data.', err);
        const mock = searchMockPlaces(filters, center);
        return mock.length ? mock : searchMockPlaces({ type: filters.type, radius: Infinity }, center);
    }
}

// Google's price enum -> our 1..4 scale. null = Google doesn't know, which we
// let through every budget filter rather than wrongly hiding the place.
function priceLevelToNumber(level) {
    const map = {
        FREE: 1, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4,
        PRICE_LEVEL_FREE: 1, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
        PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };
    return map[String(level)] ?? null;
}

async function searchGooglePlaces(filters, center) {
    if (!window.google?.maps?.importLibrary) throw new Error('maps loader not present');
    const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary('places');

    const { places } = await Place.searchNearby({
        fields: ['id', 'displayName', 'rating', 'userRatingCount',
                 'priceLevel', 'location', 'formattedAddress'],
        locationRestriction: { center, radius: filters.radius ?? 1200 },
        includedPrimaryTypes: [filters.type ?? 'restaurant'],
        maxResultCount: 20,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
    });

    return places
        .map(p => {
            const loc = { lat: p.location.lat(), lng: p.location.lng() };
            return {
                id: p.id,
                name: p.displayName,
                rating: p.rating ?? 0,
                ratingCount: p.userRatingCount ?? 0,
                price: priceLevelToNumber(p.priceLevel),
                address: p.formattedAddress ?? '',
                ...loc,
                distance: distanceMeters(center, loc),
            };
        })
        .filter(p => (p.price ?? 0) <= (filters.maxPrice ?? 4))
        .sort((x, y) => y.rating - x.rating)
        .slice(0, 6);
}

function searchMockPlaces(filters, center) {
    const matchesType = p =>
        filters.type === 'restaurant' || !filters.type || p.type === filters.type;

    return MOCK_PLACES
        .filter(matchesType)
        .filter(p => p.price <= (filters.maxPrice ?? 4))
        .map(p => ({ ...p, distance: distanceMeters(center, p) }))
        .filter(p => p.distance <= (filters.radius ?? 2500))
        .sort((x, y) => y.rating - x.rating)
        .slice(0, 6);
}
