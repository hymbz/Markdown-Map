import mapboxgl, {
  type ImageSource,
  type ImageSourceRaw,
  type RasterLayer,
} from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { createEffectOn, isEqual } from '../helper';
import { setState, store } from '../store';
import { map } from '../store/map';
import { parseMd } from '../parseMd';

export const useRasterImages = () => {
  createEffectOn(
    [() => store.rasterImages, () => store.showRasterImage],
    ([rasterImages, showRasterImage], __, prevUseImages) => {
      const useImages = new Map<string, mapboxgl.Marker[]>();

      const image =
        showRasterImage &&
        rasterImages.find((img) => img.name === showRasterImage);
      if (image) {
        const { name, opacity, coordinates, url } = image;

        const id = `__${name}`;
        useImages.set(id, []);

        // 添加或更新 Source
        const lastSource = map.getSource(id) as ImageSourceRaw | undefined;
        if (!lastSource) map.addSource(id, { type: 'image', url, coordinates });
        else if (lastSource.url !== url) {
          map.removeLayer(id);
          map.removeSource(id);
          map.addSource(id, { type: 'image', url, coordinates });
        } else if (!isEqual(lastSource.coordinates, coordinates))
          (map.getSource(id) as ImageSource).setCoordinates(coordinates);

        // 添加或更新 Layer
        const layerOption: RasterLayer = {
          id,
          type: 'raster',
          source: id,
          paint: { 'raster-fade-duration': 0, 'raster-opacity': opacity ?? 1 },
        };
        const lastLayer = map.getLayer(id) as RasterLayer | undefined;
        if (!lastLayer) map.addLayer(layerOption, 'title-secondary');
        else if (
          lastLayer?.paint!['raster-opacity'] !==
          layerOption.paint!['raster-opacity']
        ) {
          map.removeLayer(id);
          map.addLayer(layerOption, 'title-secondary');
        }

        // 添加用于移动调整图片四角坐标的标记
        if (name.startsWith('_')) {
          for (const [lng, lat] of coordinates) {
            const marker = new mapboxgl.Marker({ draggable: true })
              .setLngLat([lng, lat])
              .addTo(map);
            useImages.get(id)!.push(marker);

            marker.on('dragend', async () => {
              const lngLat = marker.getLngLat();
              const md = store.md.replace(
                new RegExp(
                  `(name: ${name}[\\s\\S]*?\n( ){6}- - )${lng}(\\s*\n( ){8}- )${lat}`,
                ),
                `$1${lngLat.lng}$3${lngLat.lat}`,
              );
              setState(await parseMd({ md }));
            });
          }
        }
      }

      // 删除之前添加现在未使用的数据
      if (prevUseImages) {
        for (const [id, markers] of (
          prevUseImages as typeof useImages
        ).entries()) {
          for (const marker of markers) marker.remove();
          if (useImages.has(id)) continue;
          map.removeLayer(id);
          map.removeSource(id);
        }
      }

      return useImages;
    },
  );
};
