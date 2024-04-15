import { createStore } from 'solid-js/store';
import { ReactiveMap } from '@solid-primitives/map';
import { ReactiveSet } from '@solid-primitives/set';
import { createRoot } from 'solid-js';
import { type RootContent } from 'mdast';
import toast from 'solid-toast';

import exampleMd from '../../example.md?raw';
import { createEffectOn, scrollIntoView } from '../helper';
import { type RasterImage } from '../map';

export interface Marker {
  id: string;
  no: string | undefined;
  name: string;
  lngLat?: [number, number];
  descTree: RootContent[];
  desc: string;
  tags: string[];
  isSecondary: boolean;
  color: string;
  group: string;
  position: {
    start: number;
    end: number;
  };
}

export interface Group {
  id: string;
  name: string;
  descTree: RootContent[];
  desc: string;
  markers: string[];
  position: {
    start: number;
    end: number;
  };
}

export const [store, setState] = createStore({
  md: '',
  defaultCenter: { lng: 139.803_41, lat: 35.647_21 },
  defaultZoom: 15,

  name: 'Markdown Map',
  desc: '',
  baseUrl: location.origin,

  groups: new ReactiveMap<string, Group>(),
  markers: new ReactiveMap<string, Marker>(),
  tagColors: { default: '#0288D1' } as Record<string, string>,
  rasterImages: [] as RasterImage[],

  showRasterImage: '',
  doneMarkers: new ReactiveSet<string>(
    localStorage.getItem('doneMarkers')?.split(',').filter(Boolean),
  ),

  search: {
    includeList: [] as string[],
    excludeList: [] as string[],
    markers: undefined as ReactiveSet<string> | undefined,
  },

  activeItem: '',
  activeGroup: '',
  hoverItem: '',
  copyMode: false,
  editMode: false,
  isEditing: false,

  itemListRef: undefined as HTMLDivElement | undefined,
  isRemote: location.pathname !== '/',
  frontmatter: {} as Record<string, any>,
});

Object.assign(window, { store, setState });

export const getMarker = (id: string) => store.markers.get(id);

export const loadExample = () => setState('md', exampleMd);

/** 获取绝对链接 */
export const getUrl = (url: string, baseUrl = store.baseUrl) => {
  if (!url || url.startsWith('http')) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

createRoot(() => {
  createEffectOn(
    () => store.activeItem,
    (id) => {
      const marker = getMarker(id);
      if (!marker) return;
      setState('activeGroup', marker.group);

      setTimeout(() => {
        const element = document.querySelector<HTMLElement>(
          `#sidebar .item[data-id="${id}"]`,
        );
        if (!store.itemListRef || !element) return;
        scrollIntoView(element);
      });
    },
  );

  createEffectOn(
    () => store.activeGroup,
    (groupId) => {
      const group = store.groups.get(groupId);
      if (!group?.markers.includes(store.activeItem))
        setState('activeItem', '');
    },
  );

  createEffectOn(
    [() => store.activeGroup, () => store.activeItem],
    ([groupId, itemId]) => {
      if (!groupId || itemId) return;
      // 切换到分组时自动滚动到顶
      scrollIntoView(document.querySelector('.item-list div:first-of-type')!);
    },
  );

  createEffectOn(
    () => store.md,
    (md) => {
      if (store.isRemote) return;
      try {
        localStorage.setItem('md', md.trim());
      } catch (error) {
        console.error(error);
        toast.error('保存本地文档失败');
      }
    },
    { defer: true },
  );

  // 自动保存 doneMarkers
  createEffectOn(
    () => [...store.doneMarkers],
    (doneMarkers) =>
      localStorage.setItem(
        'doneMarkers',
        doneMarkers.filter((id) => store.markers.has(id)).join(','),
      ),
    { defer: true },
  );
});
