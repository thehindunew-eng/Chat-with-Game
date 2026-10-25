import type {
  ItineraryDay,
  PollOption,
  ResultLink,
  ResultRow,
  SearchCard,
  Vertical,
} from "./types";

export const VERTICALS: {
  id: Vertical | "auto";
  label: string;
  icon: string;
  hint: string;
}[] = [
  { id: "auto", label: "Smart Auto", icon: "✨", hint: "Auto-detect search intent" },
  { id: "trips", label: "Trip Plan", icon: "🧭", hint: "Build complete itinerary with budget & weather" },
  { id: "trains", label: "Trains", icon: "🚆", hint: "IRCTC live trains, routes & seat availability" },
  { id: "flights", label: "Flights", icon: "✈️", hint: "Compare airfares & best flying schedules" },
  { id: "movies", label: "Movies", icon: "🎬", hint: "Movie tickets, showtimes, trailer & reviews" },
  { id: "stays", label: "Stays & Hotels", icon: "🏨", hint: "Hotels, resorts, homestays & villas" },
  { id: "weather", label: "Live Weather", icon: "🌦", hint: "Current temperature & 5-day forecast" },
  { id: "places", label: "Places & Maps", icon: "📍", hint: "Explore attractions & spots on the map" },
  { id: "food", label: "Food & Dining", icon: "🍔", hint: "Restaurants, cafes & delivery" },
  { id: "money", label: "Money & Forex", icon: "💱", hint: "Live currency rates & split-bill calculator" },
  { id: "shopping", label: "Shopping", icon: "🛍", hint: "Compare deals & prices" },
  { id: "fact", label: "Web Answer", icon: "🌐", hint: "Direct facts & instant answers" },
];

export const SEARCH_PRESETS = [
  { label: "🧭 Weekend Trip Plan", query: "plan a 3-day weekend trip for 4 people" },
  { label: "🎬 Cinema Tonight", query: "movie tickets and showtimes tonight" },
  { label: "🌦 Live Weather", query: "weather forecast for the next 5 days" },
  { label: "🚆 Express Trains", query: "trains tomorrow morning schedule" },
  { label: "✈️ Flight Fares", query: "cheapest flights next month" },
  { label: "🍕 Food Spots", query: "top rated pizza and cafes nearby" },
  { label: "💱 $500 Split 4 Ways", query: "500 usd to inr split between 4 people" },
  { label: "🏨 Stays & Villas", query: "top rated stays for 4 guests" },
];

const META: Record<Vertical, { label: string; icon: string }> = {
  fact: { label: "Web Answer", icon: "🌐" },
  trains: { label: "Train Planner", icon: "🚆" },
  flights: { label: "Flight Radar", icon: "✈️" },
  movies: { label: "Cinema & Tickets", icon: "🎬" },
  trips: { label: "Trip Itinerary", icon: "🧭" },
  stays: { label: "Stay Finder", icon: "🏨" },
  weather: { label: "Live Forecast", icon: "🌦" },
  places: { label: "Maps & Sights", icon: "📍" },
  food: { label: "Food & Dining", icon: "🍔" },
  shopping: { label: "Price Comparison", icon: "🛍" },
  money: { label: "Forex & Split", icon: "💱" },
};

const enc = encodeURIComponent;
const g = (q: string): ResultLink => ({
  label: "Search Google/DDG",
  url: `https://duckduckgo.com/?q=${enc(q)}`,
  icon: "🔎",
});

export const TIME_WORDS =
  /\b(today|tonight|tomorrow|day after tomorrow|yesterday|this|next|coming|last)?\s*(week|weekend|month|morning|evening|afternoon|night|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\btomorrow\b|\btoday\b|\btonight\b/gi;

/* ---------------- Intent Detection ---------------- */
export function detectVertical(q: string): Vertical {
  const t = q.toLowerCase();
  if (/\b(trains?|irctc|pnr|railways?|rail|express|sleeper|tatkal|rajdhani|shatabdi|vande bharat)\b/.test(t))
    return "trains";
  if (/\b(flights?|fly|airfare|airlines?|airports?|indigo|air india|emirates)\b/.test(t))
    return "flights";
  if (/\b(movies?|films?|cinemas?|showtimes?|show time|tickets? for|bookmyshow|imdb|trailers?|pvr|inox)\b/.test(t))
    return "movies";
  if (/\b(hotels?|stays?|resorts?|hostels?|airbnb|homestays?|rooms? in|lodges?|villas?)\b/.test(t))
    return "stays";
  if (/\b(weather|forecast|temperature|rain|climate|how hot|how cold|degrees|monsoon)\b/.test(t))
    return "weather";
  if (/\b(trips?|itinerary|travel|vacation|holidays?|tours?|visit|weekend getaway|things to do|places to visit|road trip)\b/.test(t))
    return "trips";
  if (/\b(restaurants?|cafes?|cafés?|eat|food|dinner|lunch|brunch|swiggy|zomato|order in|biryani|pizza near|bars?|pubs?|bakery)\b/.test(t))
    return "food";
  if (/\b(near me|nearby|directions|address|where is|map of|route to|petrol pump|atm|hospitals?|landmarks?)\b/.test(t))
    return "places";
  if (/\b(buy|price of|cheapest|deal|amazon|flipkart|discount|shopping|coupon)\b/.test(t))
    return "shopping";
  if (/\b(\d+\s*)?(usd|inr|eur|gbp|aed|jpy|sgd|aud|cad|rupee|dollar|euro|pound)\b.*\b(to|in|convert)\b|\bexchange rate\b|\bconvert\b.*\bcurrency\b|\bsplit\b/.test(t))
    return "money";
  return "fact";
}

/* ---------------- Extraction Helpers ---------------- */
function extractPlace(raw: string): string {
  const q = raw.replace(TIME_WORDS, " ").replace(/\s+/g, " ").trim();
  const m =
    q.match(/\b(?:in|at|for|to|near|around)\s+([A-Za-z][A-Za-z\s.'-]{1,40})$/i) ||
    q.match(/\b(?:in|at|for|to|near|around)\s+([A-Za-z][A-Za-z\s.'-]{1,40}?)\s+(?:on|this|next|tomorrow|today|weekend|under|with|for)\b/i);
  if (m) return m[1].trim();
  const cleaned = q
    .replace(
      /\b(weather|forecast|temperature|hotels?|stays?|restaurants?|food|places|trips?|travel|itinerary|plan|visit|things to do|flights?|trains?|movies?|in|to|the|a|an|best|top|good|cheap|near|me|for|of|what|is|how)\b/gi,
      " "
    )
    .replace(/[^A-Za-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(" ").slice(0, 3).join(" ");
}

function extractRoute(raw: string): { from?: string; to?: string } {
  const q = raw.replace(TIME_WORDS, " ").replace(/\s+/g, " ").trim();
  const m =
    q.match(/from\s+([A-Za-z\s.'-]{2,30}?)\s+to\s+([A-Za-z\s.'-]{2,30})(?:\s|$)/i) ||
    q.match(/\b([A-Za-z.'-]{3,20})\s+(?:to|->|→)\s+([A-Za-z.'-]{3,20})\b/i);
  if (m) return { from: m[1].trim(), to: m[2].trim() };
  return {};
}

function extractDate(q: string): string {
  const t = q.toLowerCase();
  const d = new Date();
  if (/tomorrow/.test(t)) d.setDate(d.getDate() + 1);
  else if (/day after/.test(t)) d.setDate(d.getDate() + 2);
  else if (/next week/.test(t)) d.setDate(d.getDate() + 7);
  else if (/weekend/.test(t)) d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

/* ---------------- Providers ---------------- */
async function duckduckgo(query: string) {
  try {
    const r = await fetch(
      `https://api.duckduckgo.com/?q=${enc(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    const text: string = d.AbstractText || d.Answer || "";
    const related: string[] = (d.RelatedTopics || [])
      .map((x: any) => x?.Text)
      .filter(Boolean)
      .slice(0, 3);
    if (text && text.length > 10)
      return {
        text,
        related,
        source: {
          title: d.AbstractSource || "DuckDuckGo",
          url: d.AbstractURL || `https://duckduckgo.com/?q=${enc(query)}`,
        },
      };
    return null;
  } catch {
    return null;
  }
}

async function wikipedia(query: string) {
  try {
    const s = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${enc(
        query
      )}&format=json&origin=*&srlimit=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const title = (await s.json())?.query?.search?.[0]?.title;
    if (!title) return null;
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${enc(title)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.extract) return null;
    return {
      text: d.extract as string,
      source: {
        title: "Wikipedia — " + d.title,
        url:
          d.content_urls?.desktop?.page ||
          `https://en.wikipedia.org/wiki/${enc(title)}`,
      },
    };
  } catch {
    return null;
  }
}

async function geocode(place: string) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${enc(
        place
      )}&format=json&limit=1&addressdetails=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const h = (await r.json())?.[0];
    if (h) {
      const a = h.address || {};
      return {
        name: (a.city ||
          a.town ||
          a.village ||
          a.state_district ||
          a.state ||
          a.county ||
          String(h.display_name).split(",")[0]) as string,
        admin: (a.state || "") as string,
        country: (a.country || "") as string,
        lat: parseFloat(h.lat),
        lon: parseFloat(h.lon),
      };
    }
  } catch {
    /* ignore */
  }

  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${enc(
        place
      )}&count=10&language=en&format=json`,
      { signal: AbortSignal.timeout(7000) }
    );
    const list: any[] = (await r.json())?.results || [];
    const needle = place.trim().toLowerCase();
    const exact = list.filter((x) => String(x.name).toLowerCase() === needle);
    const pool = exact.length ? exact : list;
    const hit = [...pool].sort(
      (a, b) => (b.population || 0) - (a.population || 0)
    )[0];
    return hit
      ? {
          name: hit.name as string,
          country: (hit.country || "") as string,
          admin: (hit.admin1 || "") as string,
          lat: hit.latitude as number,
          lon: hit.longitude as number,
        }
      : null;
  } catch {
    return null;
  }
}

const WMO: Record<number, string> = {
  0: "Clear ☀️",
  1: "Mostly clear 🌤",
  2: "Partly cloudy ⛅",
  3: "Overcast ☁️",
  45: "Fog 🌫",
  48: "Rime fog 🌫",
  51: "Light drizzle 🌦",
  53: "Drizzle 🌦",
  55: "Heavy drizzle 🌦",
  61: "Light rain 🌧",
  63: "Rain 🌧",
  65: "Heavy rain 🌧",
  71: "Light snow 🌨",
  73: "Snow 🌨",
  75: "Heavy snow ❄️",
  80: "Showers 🌦",
  81: "Showers 🌧",
  82: "Violent showers ⛈",
  95: "Thunderstorm ⛈",
  96: "Thunderstorm + hail ⛈",
  99: "Severe thunderstorm ⛈",
};

async function forecast(lat: number, lon: number) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=5&timezone=auto`,
      { signal: AbortSignal.timeout(8000) }
    );
    return await r.json();
  } catch {
    return null;
  }
}

async function places(query: string, limit = 5) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${enc(
        query
      )}&format=json&limit=${limit}&addressdetails=1`,
      { signal: AbortSignal.timeout(9000) }
    );
    const d = await r.json();
    return (d as any[]).map((p) => ({
      title: (p.name || p.display_name.split(",")[0]) as string,
      subtitle: p.display_name as string,
      meta: (p.type || p.class || "").replace(/_/g, " "),
      url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`,
    })) as ResultRow[];
  } catch {
    return [];
  }
}

/* ---------------- Vertical Builders ---------------- */

async function buildWeather(q: string): Promise<Partial<SearchCard>> {
  const place = extractPlace(q) || q;
  const geo = await geocode(place);
  if (!geo)
    return {
      headline: `Couldn't locate "${place}". Try a specific city name like "Goa", "Jaipur" or "Manali".`,
      links: [g(q + " weather forecast")],
    };
  const f = await forecast(geo.lat, geo.lon);
  const where = [...new Set([geo.name, geo.admin, geo.country].filter(Boolean))].join(", ");
  if (!f?.current)
    return {
      headline: `Found ${where}, but live meteorological station is refreshing.`,
      links: [g(q)],
    };
  const rows: ResultRow[] = (f.daily?.time || []).slice(0, 5).map(
    (day: string, i: number) => ({
      title: new Date(day).toLocaleDateString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      subtitle: WMO[f.daily.weather_code[i]] || "—",
      meta: `${Math.round(f.daily.temperature_2m_min[i])}° / ${Math.round(
        f.daily.temperature_2m_max[i]
      )}°C · 💧${f.daily.precipitation_probability_max?.[i] ?? 0}%`,
    })
  );
  return {
    headline: `${where}: ${Math.round(f.current.temperature_2m)}°C right now, ${
      WMO[f.current.weather_code] || "—"
    } (feels like ${Math.round(f.current.apparent_temperature)}°C).`,
    detail: `Humidity ${f.current.relative_humidity_2m}% · Wind ${Math.round(
      f.current.wind_speed_10m
    )} km/h · Live from Open-Meteo.`,
    rows,
    links: [
      {
        label: `Hourly forecast for ${geo.name}`,
        url: `https://www.google.com/search?q=${enc(geo.name + " hourly weather forecast")}`,
        icon: "⏱",
      },
      {
        label: "Open in Maps",
        url: `https://www.openstreetmap.org/#map=11/${geo.lat}/${geo.lon}`,
        icon: "🗺",
      },
    ],
    tips: ["Great for date-selection for squad trips — share and ask everyone to vote 👍"],
    source: { title: "Open-Meteo (live satellite)", url: "https://open-meteo.com" },
  };
}

async function buildTrains(q: string): Promise<Partial<SearchCard>> {
  const { from, to } = extractRoute(q);
  const date = extractDate(q);
  const pnr = q.match(/\b\d{10}\b/)?.[0];
  const links: ResultLink[] = [];
  if (pnr)
    links.push({
      label: `Check PNR ${pnr} Status`,
      url: `https://www.google.com/search?q=${enc("PNR status " + pnr)}`,
      icon: "🎟",
    });
  if (from && to) {
    links.push(
      {
        label: `IRCTC: Book ${from} → ${to}`,
        url: `https://www.irctc.co.in/nget/train-search`,
        icon: "🎫",
        note: `${date} · official booking portal`,
      },
      {
        label: `Erail Timetable ${from} → ${to}`,
        url: `https://erail.in/trains-between-stations/${enc(from)}/${enc(to)}`,
        icon: "🚆",
        note: "live timings, schedule, class availability",
      },
      {
        label: `Seat Availability & Fares`,
        url: `https://www.google.com/search?q=${enc(
          `trains from ${from} to ${to} on ${date} seat availability`
        )}`,
        icon: "💺",
      },
      {
        label: `Route Map & Stations`,
        url: `https://www.google.com/maps/dir/${enc(from)}/${enc(to)}`,
        icon: "🗺",
      }
    );
  } else {
    links.push(
      {
        label: "IRCTC Train Search",
        url: "https://www.irctc.co.in/nget/train-search",
        icon: "🎫",
      },
      {
        label: "Live Train Running Status (NTES)",
        url: "https://enquiry.indianrail.gov.in/mntes/",
        icon: "📡",
      }
    );
  }
  links.push(g(q));
  return {
    headline:
      from && to
        ? `🚆 Train Plan: ${from} → ${to} on ${new Date(date).toDateString()}. Check live trains, seat quotas, and fares below.`
        : `🚆 Train Desk Ready. Example: try asking "trains from Delhi to Jaipur tomorrow".`,
    detail:
      "Direct deep links to IRCTC, Erail, and route mapping so your squad can split the reservation work seamlessly.",
    rows:
      from && to
        ? [
            { title: "Departure Station", subtitle: from, meta: "Origin" },
            { title: "Arrival Destination", subtitle: to, meta: "Destination" },
            { title: "Journey Date", subtitle: new Date(date).toDateString(), meta: "Travel Date" },
          ]
        : undefined,
    links,
    tips: ["Post this card into the room so everyone can confirm the travel date."],
  };
}

async function buildFlights(q: string): Promise<Partial<SearchCard>> {
  const { from, to } = extractRoute(q);
  const date = extractDate(q);
  const route = from && to ? `${from} to ${to}` : extractPlace(q);
  return {
    headline:
      from && to
        ? `✈️ Flight Radar: ${from} → ${to} around ${new Date(date).toDateString()}.`
        : `✈️ Flight Desk Ready for "${route || q}". Compare lowest fares and schedules.`,
    detail: "Compare lowest price calendars across Google Flights, Skyscanner, and Kayak.",
    links: [
      {
        label: "Google Flights (Price Matrix)",
        url: `https://www.google.com/travel/flights?q=${enc(
          `Flights ${from && to ? `from ${from} to ${to}` : route} on ${date}`
        )}`,
        icon: "✈️",
        note: "interactive price calendar",
      },
      {
        label: "Skyscanner Compare",
        url: `https://www.skyscanner.co.in/transport/flights/?adults=1&query=${enc(
          route || q
        )}`,
        icon: "🛫",
      },
      {
        label: "Kayak Flight Deals",
        url: `https://www.kayak.com/explore?q=${enc(route || q)}`,
        icon: "🧭",
      },
      g(q),
    ],
    tips: ["Add a note on the card before posting, like 'Targeting early morning flights'!"],
  };
}

async function buildMovies(q: string): Promise<Partial<SearchCard>> {
  const cityMatch = q.match(/\b(?:in|at|near)\s+([A-Za-z][A-Za-z\s.'-]{2,30})$/i);
  const city = cityMatch?.[1]?.trim();
  const title = q
    .replace(cityMatch ? cityMatch[0] : "", " ")
    .replace(
      /\b(movies?|films?|showtimes?|tickets?|book|booking|for|near me|cinemas?|reviews?|watch|the movie)\b/gi,
      " "
    )
    .replace(TIME_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  const info =
    (await duckduckgo(title + " film")) || (await wikipedia(title + " film"));

  return {
    headline: `🎬 ${title || q}${
      city ? ` · Showtimes in ${city}` : ""
    } — ${info?.text ? info.text.slice(0, 280) : "Showtimes and online booking are ready."}`,
    detail: info?.text
      ? undefined
      : "Includes direct BookMyShow seat booking, IMDb ratings, and trailers.",
    links: [
      {
        label: `Book Seats on BookMyShow`,
        url: `https://in.bookmyshow.com/explore/movies?q=${enc(title)}`,
        icon: "🎟",
        note: "seat matrix & cinemas",
      },
      {
        label: city ? `Showtimes in ${city}` : "Showtimes Near You",
        url: `https://www.google.com/search?q=${enc(
          title + " showtimes " + (city || "near me")
        )}`,
        icon: "🕒",
      },
      {
        label: `Watch Official Trailer`,
        url: `https://www.youtube.com/results?search_query=${enc(
          title + " official trailer"
        )}`,
        icon: "▶️",
      },
      {
        label: `IMDb Ratings & Trivia`,
        url: `https://www.imdb.com/find/?q=${enc(title)}`,
        icon: "⭐",
      },
    ],
    tips: ["Toggle 'Ask group to vote' to poll which movie time works for everyone!"],
    source: info?.source,
  };
}

async function buildTrips(q: string): Promise<Partial<SearchCard>> {
  const place = extractPlace(q) || q;
  const [geo, info] = await Promise.all([geocode(place), wikipedia(place)]);
  const rows: ResultRow[] = [];
  let weatherLine = "";
  if (geo) {
    const f = await forecast(geo.lat, geo.lon);
    if (f?.daily) {
      weatherLine = ` Forecast for next 3 days: ${f.daily.time
        .slice(0, 3)
        .map(
          (d: string, i: number) =>
            `${new Date(d).toLocaleDateString([], { weekday: "short" })} ${Math.round(
              f.daily.temperature_2m_min[i]
            )}–${Math.round(f.daily.temperature_2m_max[i])}°C`
        )
        .join(", ")}.`;
      f.daily.time.slice(0, 3).forEach((d: string, i: number) =>
        rows.push({
          title: new Date(d).toLocaleDateString([], {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          subtitle: WMO[f.daily.weather_code[i]] || "—",
          meta: `${Math.round(f.daily.temperature_2m_min[i])}° / ${Math.round(
            f.daily.temperature_2m_max[i]
          )}°C`,
        })
      );
    }
  }
  const where = geo
    ? [...new Set([geo.name, geo.country].filter(Boolean))].join(", ")
    : place;

  // Generate interactive 3-day itinerary
  const itinerary: ItineraryDay[] = [
    { day: "Day 1", activity: `Arrival, hotel check-in & evening sunset exploration in ${where}`, estCost: "₹2,500/person", icon: "🧳" },
    { day: "Day 2", activity: `Top sights, local cafes, heritage walk & night market`, estCost: "₹3,200/person", icon: "📸" },
    { day: "Day 3", activity: `Adventure activity, souvenir shopping & return journey`, estCost: "₹1,800/person", icon: "🛫" },
  ];

  return {
    headline: `🧭 Trip Planner: ${where}.${weatherLine}`,
    detail: info?.text
      ? info.text.slice(0, 320) + "…"
      : "Complete itinerary plan with booking links, stays, maps and travel guides.",
    rows: rows.length ? rows : undefined,
    itinerary,
    splitEstimate: { total: "₹30,000", perPerson: "₹7,500", count: 4 },
    links: [
      {
        label: `Things to Do in ${where}`,
        url: `https://www.google.com/search?q=${enc("top things to do in " + where)}`,
        icon: "🧭",
      },
      {
        label: "Search Flights",
        url: `https://www.google.com/travel/flights?q=${enc("flights to " + where)}`,
        icon: "✈️",
      },
      {
        label: "Search Trains",
        url: `https://www.irctc.co.in/nget/train-search`,
        icon: "🚆",
      },
      {
        label: "Booking.com Stays",
        url: `https://www.booking.com/searchresults.html?ss=${enc(where)}`,
        icon: "🏨",
      },
      {
        label: "OpenStreetMap Sights",
        url: `https://www.openstreetmap.org/search?query=${enc(where)}`,
        icon: "🗺",
      },
      {
        label: "Wikivoyage Travel Guide",
        url: `https://en.wikivoyage.org/wiki/Special:Search?search=${enc(where)}`,
        icon: "📗",
      },
    ],
    tips: ["Share this itinerary card and vote on dates together!"],
    source: info?.source,
  };
}

async function buildStays(q: string): Promise<Partial<SearchCard>> {
  const place = extractPlace(q) || q;
  const rows = await places(`hotels in ${place}`, 4);
  return {
    headline: `🏨 Stays & Accommodations in ${place}. Compare verified listings across platforms.`,
    rows: rows.length ? rows : undefined,
    links: [
      {
        label: `Booking.com — ${place}`,
        url: `https://www.booking.com/searchresults.html?ss=${enc(place)}`,
        icon: "🏨",
      },
      {
        label: `Airbnb Homes & Villas`,
        url: `https://www.airbnb.co.in/s/${enc(place)}/homes`,
        icon: "🏡",
      },
      {
        label: `MakeMyTrip Hotels`,
        url: `https://www.makemytrip.com/hotels/`,
        icon: "🧳",
      },
      {
        label: "Hostelworld Backpacker Stays",
        url: `https://www.hostelworld.com/s?q=${enc(place)}`,
        icon: "🎒",
      },
      g(q),
    ],
    tips: ["Post this card into chat so teammates can react with their top pick!"],
    source: rows.length
      ? { title: "OpenStreetMap (live)", url: "https://www.openstreetmap.org" }
      : undefined,
  };
}

async function buildPlaces(
  q: string,
  kind: "places" | "food"
): Promise<Partial<SearchCard>> {
  const cleaned = q
    .replace(/\b(near me|nearby|find|show|me|the|best|good|top)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rows = await places(
    kind === "food" ? cleaned || "restaurants" : cleaned || q,
    5
  );
  return {
    headline: rows.length
      ? `Found ${rows.length} spot${rows.length === 1 ? "" : "s"} for "${cleaned || q}" on live maps.`
      : `No immediate pin matches for "${cleaned || q}" — try adding a city, e.g. "cafes in Indiranagar".`,
    rows: rows.length ? rows : undefined,
    links: [
      {
        label: "Open in Google Maps",
        url: `https://www.google.com/maps/search/${enc(cleaned || q)}`,
        icon: "🗺",
      },
      ...(kind === "food"
        ? [
            {
              label: "Order on Swiggy",
              url: `https://www.swiggy.com/search?query=${enc(cleaned)}`,
              icon: "🛵",
            },
            {
              label: "Explore on Zomato",
              url: `https://www.zomato.com/search?q=${enc(cleaned)}`,
              icon: "🍽",
            },
          ]
        : [
            {
              label: "Directions & Route",
              url: `https://www.google.com/maps/dir//${enc(cleaned || q)}`,
              icon: "🧭",
            },
          ]),
      g(q),
    ],
    tips: ["Tap pins on the map to coordinate meetup points with the room."],
    source: rows.length
      ? { title: "OpenStreetMap / Nominatim (live)", url: "https://www.openstreetmap.org" }
      : undefined,
  };
}

async function buildShopping(q: string): Promise<Partial<SearchCard>> {
  const item = q
    .replace(
      /\b(buy|price of|cheapest|best|deal on|where can i|get|a|an|the)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  return {
    headline: `🛍 Price Scan for "${item || q}". Compare live store deals across major platforms.`,
    links: [
      {
        label: "Amazon Store Deals",
        url: `https://www.amazon.in/s?k=${enc(item)}`,
        icon: "📦",
      },
      {
        label: "Flipkart Compare",
        url: `https://www.flipkart.com/search?q=${enc(item)}`,
        icon: "🛒",
      },
      {
        label: "Google Shopping Price Grid",
        url: `https://www.google.com/search?tbm=shop&q=${enc(item)}`,
        icon: "🏷",
      },
      g(q),
    ],
    tips: ["Add a note with the lowest price you found so no one overpays!"],
  };
}

async function buildMoney(q: string): Promise<Partial<SearchCard>> {
  const m = q.match(/(\d+(?:\.\d+)?)?\s*([a-z]{3})\s*(?:to|in|->|→)\s*([a-z]{3})/i);
  const amount = m?.[1] ? parseFloat(m[1]) : 1;
  const from = (m?.[2] || "USD").toUpperCase();
  const to = (m?.[3] || "INR").toUpperCase();
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      signal: AbortSignal.timeout(7000),
    });
    const d = await r.json();
    const rate = d?.rates?.[to];
    if (!rate) throw new Error();
    const popular = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"]
      .filter((c) => c !== from)
      .slice(0, 5);
    return {
      headline: `💱 Live Forex: ${amount.toLocaleString()} ${from} = ${(
        amount * rate
      ).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to} (1 ${from} = ${rate.toFixed(
        3
      )} ${to}).`,
      detail: `Real-time mid-market forex rate · Updated ${
        d.time_last_update_utc?.slice(5, 16) || "today"
      }.`,
      rows: popular.map((c) => ({
        title: `${amount} ${from} → ${c}`,
        subtitle:
          (amount * (d.rates[c] || 0)).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) +
          " " +
          c,
        meta: `1 = ${(d.rates[c] || 0).toFixed(2)}`,
      })),
      splitEstimate: {
        total: `${amount.toLocaleString()} ${from}`,
        perPerson: `${(amount / 4).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${from}`,
        count: 4,
      },
      links: [
        {
          label: "Historical FX Rate Chart",
          url: `https://www.google.com/search?q=${enc(
            `${from} to ${to} exchange rate chart`
          )}`,
          icon: "📈",
        },
      ],
      tips: ["Perfect for splitting overseas trip expenses among squad members."],
      source: { title: "exchangerate-api (live rates)", url: "https://www.exchangerate-api.com" },
    };
  } catch {
    return {
      headline: `Couldn't reach live forex feed for ${from}→${to}. Check the link below.`,
      links: [g(q)],
    };
  }
}

async function buildFact(q: string): Promise<Partial<SearchCard>> {
  const ddg = await duckduckgo(q);
  const wiki = ddg ? null : await wikipedia(q);
  const hit = ddg || wiki;
  if (!hit)
    return {
      headline: `No instant answer found for "${q}". Open the full web search below.`,
      links: [
        g(q),
        {
          label: "Search Wikipedia Encyclopedia",
          url: `https://en.wikipedia.org/w/index.php?search=${enc(q)}`,
          icon: "📚",
        },
      ],
    };
  return {
    headline: hit.text.length > 420 ? hit.text.slice(0, 420) + "…" : hit.text,
    rows: (ddg?.related || []).map((t) => ({ title: t.slice(0, 95) })),
    links: [g(q), { label: "Read Verified Source", url: hit.source.url, icon: "📖" }],
    source: hit.source,
  };
}

/* ---------------- Entry Point ---------------- */
export async function runSearch(
  rawQuery: string,
  requested: Vertical | "auto" = "auto"
): Promise<SearchCard> {
  const query = rawQuery.replace(/^\/(ask|search|find|plan|book)\s+/i, "").trim();
  const vertical: Vertical =
    requested === "auto" ? detectVertical(query) : requested;
  let partial: Partial<SearchCard>;
  switch (vertical) {
    case "weather":
      partial = await buildWeather(query);
      break;
    case "trains":
      partial = await buildTrains(query);
      break;
    case "flights":
      partial = await buildFlights(query);
      break;
    case "movies":
      partial = await buildMovies(query);
      break;
    case "trips":
      partial = await buildTrips(query);
      break;
    case "stays":
      partial = await buildStays(query);
      break;
    case "places":
      partial = await buildPlaces(query, "places");
      break;
    case "food":
      partial = await buildPlaces(query, "food");
      break;
    case "shopping":
      partial = await buildShopping(query);
      break;
    case "money":
      partial = await buildMoney(query);
      break;
    default:
      partial = await buildFact(query);
  }

  // default poll options for collaborative decisions
  const defaultPoll: PollOption[] = [
    { id: "opt1", label: "Option A (Approved 👍)", votes: [] },
    { id: "opt2", label: "Option B (Needs adjustment 🤔)", votes: [] },
  ];

  return {
    vertical,
    label: META[vertical].label,
    icon: META[vertical].icon,
    query,
    headline: partial.headline || "No result.",
    links: partial.links?.length ? partial.links : [g(query)],
    poll: defaultPoll,
    ...partial,
  } as SearchCard;
}

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (t.length < 6 || t.length > 240) return false;
  if (t.endsWith("?")) return true;
  return /^(what|who|where|when|why|how|which|define|tell me about|find|show me|plan|book|search)\b/i.test(
    t
  );
}