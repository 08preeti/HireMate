/**
 * Curated Nashik landmarks, chowks, areas, circles, and hospitals.
 * Solves local colloquial naming, abbreviations (e.g., CCM, ABB Circle),
 * and compound addresses (e.g. Apartment, Chowk, Road).
 */

export const NASHIK_LANDMARKS = [
  {
    label: "Nashik City Centre Mall, Lawate Nagar, Untwadi Road, Nashik",
    short: "City Centre Mall (CCM)",
    lat: 19.9912,
    lng: 73.7631,
    aliases: ["ccm", "ccm nashik", "ccm nasik", "city centre mall", "city center mall", "city centre mall nashik"],
  },
  {
    label: "ABB Circle, Mahatma Nagar, Trimbak Road, Nashik",
    short: "ABB Circle",
    lat: 19.9868,
    lng: 73.7533,
    aliases: ["abb circle", "abb circle nashik", "abb circle nasik", "abb chowk", "abb circle mahatma nagar"],
  },
  {
    label: "Sambhaji Chowk, Untwadi Road, Nashik",
    short: "Sambhaji Chowk",
    lat: 19.9896,
    lng: 73.7654,
    aliases: [
      "sambhaji chowk",
      "sambhaji chowk untwadi",
      "sambhaji chowk nashik",
      "murli apartment",
      "murli apartment sambhaji chowk",
      "murli apartment untwadi",
    ],
  },
  {
    label: "Untwadi Road, Untwadi, Nashik",
    short: "Untwadi Road",
    lat: 19.9885,
    lng: 73.7667,
    aliases: ["untwadi", "untwadi rd", "untwadi road", "untwadi nashik", "untwadi rd nashik"],
  },
  {
    label: "Patrakar Colony, Parijat Nagar, Nashik",
    short: "Patrakar Colony",
    lat: 19.9950,
    lng: 73.7550,
    aliases: ["patrakar colony", "patrakar colony parijat nagar", "patrakar nagar", "patrakar colony nashik"],
  },
  {
    label: "Parijat Nagar, Mahatma Nagar Road, Nashik",
    short: "Parijat Nagar",
    lat: 19.9961,
    lng: 73.7589,
    aliases: ["parijat nagar", "parijat nagar nashik", "parijat nagar nasik"],
  },
  {
    label: "Lotus Multi Speciality Hospital, Gangapur Road, Nashik",
    short: "Lotus Hospital",
    lat: 19.9984,
    lng: 73.7692,
    aliases: ["lotus hospital", "lotus hospital nashik", "lotus hospital nasik", "lotus multispeciality hospital"],
  },
  {
    label: "Gangapur Road, Nashik",
    short: "Gangapur Road",
    lat: 20.0125,
    lng: 73.7554,
    aliases: ["gangapur rd", "gangapur road", "gangapur rd nashik", "gangapur rd, nashik", "gangapur road nashik"],
  },
  {
    label: "College Road, KTHM / BYK, Nashik",
    short: "College Road",
    lat: 20.0020,
    lng: 73.7610,
    aliases: ["college road", "college rd", "college road nashik", "college rd nashik"],
  },
  {
    label: "Mahatma Nagar, Nashik",
    short: "Mahatma Nagar",
    lat: 19.9890,
    lng: 73.7550,
    aliases: ["mahatma nagar", "mahatma nagar nashik", "mahatma nagar water tank"],
  },
  {
    label: "Central Bus Stand (CBS), Shalimar, Nashik",
    short: "CBS Nashik",
    lat: 19.9975,
    lng: 73.7898,
    aliases: ["cbs", "cbs nashik", "cbs nasik", "central bus stand", "cbs stand"],
  },
  {
    label: "Jehan Circle, Gangapur Road, Nashik",
    short: "Jehan Circle",
    lat: 20.0090,
    lng: 73.7621,
    aliases: ["jehan circle", "jahan circle", "jehan circle gangapur road", "jehan circle nashik"],
  },
  {
    label: "Canada Corner, Sharanpur Road, Nashik",
    short: "Canada Corner",
    lat: 19.9980,
    lng: 73.7770,
    aliases: ["canada corner", "canada corner nashik", "canada corner sharanpur road"],
  },
  {
    label: "Dwarka Circle, Pune-Nashik Highway, Nashik",
    short: "Dwarka Circle",
    lat: 19.9850,
    lng: 73.7990,
    aliases: ["dwarka", "dwarka circle", "dwarka chowk", "dwarka circle nashik"],
  },
  {
    label: "Mumbai Naka, Shivaji Road, Nashik",
    short: "Mumbai Naka",
    lat: 19.9870,
    lng: 73.7830,
    aliases: ["mumbai naka", "mumbai naka nashik", "mumbai naka circle"],
  },
  {
    label: "Ashoka Marg, Nashik",
    short: "Ashoka Marg",
    lat: 19.9723,
    lng: 73.8115,
    aliases: ["ashoka marg", "ashoka marg nashik", "ashoka school marg"],
  },
  {
    label: "Satpur MIDC, Trimbak Road, Nashik",
    short: "Satpur MIDC",
    lat: 19.9980,
    lng: 73.7220,
    aliases: ["satpur", "satpur midc", "satpur nashik", "satpur industrial area"],
  },
  {
    label: "Ambad MIDC, Nashik",
    short: "Ambad MIDC",
    lat: 19.9400,
    lng: 73.7380,
    aliases: ["ambad", "ambad midc", "ambad industrial area", "ambad nashik"],
  },
  {
    label: "Trimurti Chowk, CIDCO, Nashik",
    short: "Trimurti Chowk",
    lat: 19.9620,
    lng: 73.7520,
    aliases: ["trimurti chowk", "trimurti chowk cidco", "trimurti chowk nashik"],
  },
  {
    label: "CIDCO, Nashik",
    short: "CIDCO",
    lat: 19.9600,
    lng: 73.7450,
    aliases: ["cidco", "cidco nashik", "cidco new nashik"],
  },
  {
    label: "Indira Nagar, Nashik",
    short: "Indira Nagar",
    lat: 19.9650,
    lng: 73.7750,
    aliases: ["indira nagar", "indiranagar", "indira nagar nashik", "indira nagar jogging track"],
  },
  {
    label: "Govind Nagar, Nashik",
    short: "Govind Nagar",
    lat: 19.9780,
    lng: 73.7700,
    aliases: ["govind nagar", "govind nagar nashik"],
  },
  {
    label: "Panchavati, Ramkund, Nashik",
    short: "Panchavati",
    lat: 20.0110,
    lng: 73.7930,
    aliases: ["panchavati", "ramkund", "panchavati nashik", "kalaram mandir"],
  },
  {
    label: "Nashik Road Railway Station, Nashik",
    short: "Nashik Road",
    lat: 19.9540,
    lng: 73.8380,
    aliases: ["nashik road", "nasik road", "nashik road station", "nashik road railway station"],
  },
  {
    label: "Pathardi Phata, Mumbai-Agra Highway, Nashik",
    short: "Pathardi Phata",
    lat: 19.9320,
    lng: 73.7600,
    aliases: ["pathardi phata", "pathardi", "pathardi phata nashik"],
  },
  {
    label: "Rane Nagar, CIDCO, Nashik",
    short: "Rane Nagar",
    lat: 19.9550,
    lng: 73.7650,
    aliases: ["rane nagar", "rane nagar nashik"],
  },
  {
    label: "Mhasrul, Dindori Road, Nashik",
    short: "Mhasrul",
    lat: 20.0450,
    lng: 73.8050,
    aliases: ["mhasrul", "mhasrul nashik"],
  },
  {
    label: "Upnagar, Nashik-Pune Road, Nashik",
    short: "Upnagar",
    lat: 19.9680,
    lng: 73.8250,
    aliases: ["upnagar", "upnagar nashik"],
  },
  {
    label: "Tidke Colony, Trimbak Road, Nashik",
    short: "Tidke Colony",
    lat: 19.9880,
    lng: 73.7710,
    aliases: ["tidke colony", "tidke colony nashik"],
  },
  {
    label: "Bytco Point, Nashik Road, Nashik",
    short: "Bytco Point",
    lat: 19.9520,
    lng: 73.8340,
    aliases: ["bytco", "bytco point", "bytco hospital", "bytco circle"],
  },
];

/**
 * Match user query against Nashik landmarks and colloquial names.
 * Supports exact alias matching, prefix matching, and compound address extraction.
 */
export function matchLocalNashikPlaces(query) {
  if (!query || typeof query !== "string") return [];
  const clean = query
    .toLowerCase()
    .replace(/[,\.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const results = [];

  for (const place of NASHIK_LANDMARKS) {
    let matched = false;
    let score = 0;

    // Direct alias hit
    for (const alias of place.aliases) {
      if (clean === alias) {
        matched = true;
        score = 100;
        break;
      }
      if (clean.includes(alias)) {
        matched = true;
        score = Math.max(score, 80);
      }
      if (alias.includes(clean) && clean.length >= 3) {
        matched = true;
        score = Math.max(score, 60);
      }
    }

    if (matched) {
      // If user typed an apartment/building prefix (e.g. "Murli Apartment, ..."),
      // keep that prefix in the returned label so the employer sees their exact typed building!
      let displayLabel = place.label;
      const commaParts = query.split(",").map((s) => s.trim()).filter(Boolean);
      if (commaParts.length > 1) {
        const prefix = commaParts[0];
        if (!place.label.toLowerCase().includes(prefix.toLowerCase())) {
          displayLabel = `${prefix}, ${place.label}`;
        }
      }

      results.push({
        label: displayLabel,
        short: place.short,
        lat: place.lat,
        lng: place.lng,
        score,
      });
    }
  }

  // Sort by match score
  results.sort((a, b) => b.score - a.score);
  return results.map(({ label, short, lat, lng }) => ({ label, short, lat, lng }));
}
