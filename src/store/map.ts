import mapboxgl from 'mapbox-gl';

import { store } from '.';

const getSaveCenter = (): mapboxgl.LngLatLike => {
  const text = localStorage.getItem('center');
  if (!text) return store.defaultCenter;
  return JSON.parse(text) as mapboxgl.LngLatLike;
};

const saveCenter = () =>
  localStorage.setItem('center', JSON.stringify(map.getCenter()));

const getZoom = () => Number(localStorage.getItem('zoom')) || 16;
const saveZoom = () => localStorage.setItem('zoom', `${map.getZoom()}`);

mapboxgl.accessToken = import.meta.env.VITE_ACCESS_TOKEN;

const options = {
  attributionControl: false,
  center: getSaveCenter(),
  container: 'map',
  localIdeographFontFamily: `'Noto Sans CJK SC', sans-serif`,
  renderWorldCopies: false,
  performanceMetricsCollection: false,
  hash: false,
  style: 'mapbox://styles/hymbz/clv8h4n2e00oy01qpftfv7olc',
  // style: 'mapbox://styles/itorr/cltlpf5d2015g01oidhgl1mzm',
  zoom: getZoom(),
} as mapboxgl.MapboxOptions;

export const map = new mapboxgl.Map(options);

map.on('moveend', saveCenter);
map.on('zoomend', saveZoom);
