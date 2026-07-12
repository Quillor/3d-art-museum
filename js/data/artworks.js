import { PREHISTORIC } from "./prehistoric.js";
import { AMERICAS } from "./americas.js";
import { EUROPE } from "./europe.js";
import { MIDDLE_EAST } from "./middleeast.js";
import { ASIA } from "./asia.js";
import { AFRICA } from "./africa.js";
import { OCEANIA } from "./oceania.js";

// Era metadata: label + period shown on portal signs and in the HUD/info panel,
// style = corridor architecture key (see js/styles.js).
export const ERAS = {
  prehistoric:    { label: "Prehistoric Cave Art",           period: "40,000–2,000 BCE",      style: "cave" },
  // The Americas
  mesoamerica:    { label: "Mesoamerica",                    period: "1200 BCE – 1520 CE",    style: "meso" },
  andes:          { label: "The Andes",                      period: "200 BCE – 1530 CE",     style: "inca" },
  nativenorth:    { label: "Indigenous Arts of North America", period: "1100–1900",           style: "adobe" },
  americas19:     { label: "The Americas in the 19th Century", period: "1830–1890",            style: "amsalon" },
  americasmodern: { label: "Modern Art in the Americas",     period: "1890–1930",             style: "modern" },
  // Europe
  classical:      { label: "Classical Antiquity",            period: "800 BCE – 500 CE",      style: "greek" },
  medieval:       { label: "Medieval Europe",                period: "500–1400",              style: "gothic" },
  renaissance:    { label: "The Renaissance",                period: "1400–1600",             style: "renaissance" },
  baroque:        { label: "Baroque Europe",                 period: "1600–1750",             style: "baroque" },
  romantic:       { label: "Rococo to Romanticism",          period: "1750–1850",             style: "salon" },
  impressionism:  { label: "Impressionism & After",          period: "1860–1905",             style: "salon2" },
  euromodern:     { label: "European Modernism",             period: "1890–1950",             style: "euromodern" },
  // Middle East
  neolithic:      { label: "The First Villages",             period: "9500–5000 BCE",         style: "neolithic" },
  mesopotamia:    { label: "Mesopotamia",                    period: "3500–539 BCE",          style: "mesopotamia" },
  persia:         { label: "Persia & the Classical East",    period: "550 BCE – 630 CE",      style: "persia" },
  islamic:        { label: "The Islamic Golden Age",         period: "700–1500",              style: "islamic" },
  ottoman:        { label: "Ottoman Court Arts",             period: "1500–1900",             style: "ottoman" },
  memodern:       { label: "Modern Art of the Middle East",  period: "1850–1950",             style: "memodern" },
  // Asia
  indus:          { label: "Indus Valley & Early India",     period: "2600 BCE – 500 CE",     style: "indus" },
  china:          { label: "Ming China",                     period: "Broader works labeled separately", style: "china" },
  seasia:         { label: "Southeast Asia",                 period: "800–1500",              style: "khmer" },
  japan:          { label: "Japan",                          period: "700–1868",              style: "japan" },
  southasia:      { label: "Mughal South Asia",              period: "700–1850",              style: "mughal" },
  asiamodern:     { label: "Modern Asia",                    period: "1850–1950",             style: "asiamodern" },
  // Africa
  egypt:          { label: "Ancient Egypt",                  period: "3100 BCE – 300 CE",     style: "egypt" },
  kingdoms:       { label: "Kingdoms of Africa",             period: "500 BCE – 1600 CE",     style: "sahel" },
  traditions:     { label: "Asante Art & Living Traditions", period: "1200–1950",             style: "earthen" },
  // Oceania
  oceancient:     { label: "Aboriginal Australia — Kakadu Rock Art", period: "Living cultural landscape", style: "rockshelter" },
  ocevoyage:      { label: "Voyagers of the Pacific",        period: "1200–1800",             style: "oceanic" },
  oceliving:      { label: "Māori Art & Living Traditions",  period: "1800–1950",             style: "oceanic2" },
};

// Wings radiating from the rotunda hub, ordered left-to-right as seen when
// entering from the cave. angleDeg 0 = straight ahead (north, -Z);
// negative = to the player's left.
export const REGIONS = [
  { key: "americas",   label: "The Americas",   angleDeg: -75, artworks: AMERICAS },
  { key: "europe",     label: "Europe",         angleDeg: -45, artworks: EUROPE },
  { key: "africa",     label: "Africa",         angleDeg: -15, artworks: AFRICA },
  { key: "middleeast", label: "The Middle East", angleDeg: 15, artworks: MIDDLE_EAST },
  { key: "asia",       label: "Asia",           angleDeg: 45,  artworks: ASIA },
  { key: "oceania",    label: "Oceania",        angleDeg: 75,  artworks: OCEANIA },
];

export { PREHISTORIC };

export const ALL_ARTWORKS = [
  ...PREHISTORIC, ...AMERICAS, ...EUROPE, ...MIDDLE_EAST, ...ASIA, ...AFRICA,
  ...OCEANIA,
];
