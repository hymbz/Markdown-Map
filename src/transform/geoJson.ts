import { createRootMemo } from '../helper';
import { type Marker, store } from '../store';

const toGeoJson = (markers: Marker[]) => {
  const features = markers
    .filter((marker) => marker.lngLat && !store.doneMarkers.has(marker.id))
    .map((marker) => ({
      geometry: {
        coordinates: marker.lngLat,
        type: 'Point',
      },
      properties: {
        ...marker,
        // 删掉名字前的序号
        name: /^(\d+\.?\s+)*(.*)/.exec(marker.name)?.[2],
      },
      type: 'Feature',
    }));

  return {
    type: 'geojson' as const,
    data: {
      features,
      type: 'FeatureCollection',
    } as GeoJSON.FeatureCollection,
  };
};

export const geoJson = createRootMemo(() =>
  toGeoJson([...store.markers.values()].reverse()),
);
