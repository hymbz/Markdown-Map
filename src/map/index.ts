import mapboxgl, { type GeoJSONSource } from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import 'mapbox-gl/dist/mapbox-gl.css';

import { createEffectOn } from '../helper';
import { geoJson } from '../transform/geoJson';
import { getMarker, setState, store } from '../store';
import { scrollEditor } from '../store/codeJat';
import { map } from '../store/map';
import { parseMd } from '../parseMd';

import { useRasterImages } from './rasterImages';

export interface RasterImage {
  name: string;
  url: string;
  opacity?: number;
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
}

map.addControl(new MapboxLanguage({ defaultLanguage: 'zh-Hans' }));
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true,
  }),
  'bottom-right',
);
map.addControl(
  new mapboxgl.NavigationControl({ visualizePitch: true }),
  'bottom-right',
);

(window as any).map = map;

map.on('click', (e) => {
  setState('activeItem', '');
  navigator.clipboard.writeText(`${e.lngLat.lat}, ${e.lngLat.lng}`);
});

map.on('load', () => {
  const titlePrimary: mapboxgl.SymbolLayer = {
    id: 'title-primary',
    layout: {
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-anchor': 'top',
      'text-field': ['get', 'name'],
      'text-offset': [0, 1],
      'text-optional': true,
      'text-size': 16,
      'text-max-width': 7,
    },
    paint: {
      'text-color': '#37474F',
      'text-halo-color': '#FFF',
      'text-halo-blur': 1,
      'text-halo-width': 2,
    },
    source: 'place',
    type: 'symbol',
    filter: ['!', ['get', 'isSecondary']],
  };

  const pointPrimary: mapboxgl.CircleLayer = {
    id: 'point-primary',
    paint: {
      'circle-color': '#FFF',
      'circle-radius': 10,
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 5,
    },
    source: 'place',
    type: 'circle',
    filter: ['!', ['get', 'isSecondary']],
  };

  const titleSecondary: mapboxgl.SymbolLayer = JSON.parse(
    JSON.stringify(titlePrimary),
  );
  titleSecondary.id = 'title-secondary';
  titleSecondary.source = 'place';
  titleSecondary.minzoom = 16;
  titleSecondary.layout!['text-offset'] = [0, 0.5];
  titleSecondary.layout!['text-size'] = 12;
  titleSecondary.filter![0] = 'boolean';

  const pointSecondary: mapboxgl.CircleLayer = JSON.parse(
    JSON.stringify(pointPrimary),
  );
  pointSecondary.id = 'point-secondary';
  pointSecondary.source = 'place';
  pointSecondary.minzoom = 16;
  pointSecondary.filter![0] = 'boolean';
  pointSecondary.paint = {
    'circle-color': ['get', 'color'],
    'circle-radius': 5,
    'circle-stroke-color': '#FFF',
    'circle-stroke-width': 2,
  };

  map
    .addSource('place', geoJson())
    .addLayer(titleSecondary)
    .addLayer(pointSecondary)
    .addLayer(titlePrimary)
    .addLayer(pointPrimary)
    .addLayer({
      id: 'point-text-primary',
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['get', 'no'],
        'text-optional': true,
        'text-size': 14,
        'text-max-width': 2,
      },
      paint: { 'text-color': ['get', 'color'] },
      source: 'place',
      type: 'symbol',
      filter: ['!', ['get', 'isSecondary']],
    });

  const layerList = [
    'point-primary',
    'point-secondary',
    'title-primary',
    'title-secondary',
    'point-text-primary',
  ];

  for (const layerId of layerList) {
    map
      .on('click', layerId, (e) => fly(e.features![0].properties!.id))
      .on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      })
      .on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
  }

  createEffectOn(geoJson, () => {
    (map.getSource('place') as GeoJSONSource).setData(geoJson().data);
  });

  useRasterImages();
});

/** 用于标识当前显示地点的标记 */
let marker: mapboxgl.Marker | undefined;

createEffectOn(
  () => store.activeItem,
  (id) => {
    if (marker) {
      marker.remove();
      marker = undefined;
    }

    if (id === '') return;

    const lngLat = getMarker(id)?.lngLat;
    if (!lngLat) return;
    marker = new mapboxgl.Marker({
      color: '#EF5350',
      scale: 0.8,
      draggable: true,
    })
      .setLngLat(lngLat)
      .addTo(map);

    marker.on('dragend', async () => {
      const _lngLat = getMarker(id)?.lngLat;
      if (!marker || !_lngLat) return;
      const [oldLng, oldLat] = _lngLat;
      const { lat, lng } = marker.getLngLat();
      const md = store.md.replaceAll(
        `\n#${oldLat}, ${oldLng}`,
        `\n#${lat}, ${lng}`,
      );
      setState(await parseMd({ md }));
    });
  },
);

/** 用于标识当前鼠标悬浮地点的标记 */
let hoverMarker: mapboxgl.Marker | undefined;
createEffectOn(
  () => store.hoverItem,
  (id) => {
    if (hoverMarker) {
      hoverMarker.remove();
      hoverMarker = undefined;
    }

    if (id === '' || id === store.activeItem) return;

    const lngLat = getMarker(id)?.lngLat;
    if (!lngLat) return;
    hoverMarker = new mapboxgl.Marker({ color: '#757575', scale: 0.8 })
      .setLngLat(lngLat)
      .addTo(map);
  },
);

export function fly(id: string) {
  const marker = getMarker(id);
  if (!marker) return;

  setState('activeItem', id);

  if (marker.lngLat) {
    let zoom = map.getZoom();
    if (zoom < (marker.isSecondary ? 17 : 16))
      zoom = marker.isSecondary ? 19 : 17.5;

    // 只在缩放过小或不在当前视野内时才跳转过去
    if (zoom !== map.getZoom() || !map.getBounds().contains(marker.lngLat))
      map.flyTo({
        center: marker.lngLat,
        zoom,
      });
  }

  scrollEditor();
}
