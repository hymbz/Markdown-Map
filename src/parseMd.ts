import { unified } from 'unified';
import type { RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkFrontmatter from 'remark-frontmatter';
import { u } from 'unist-builder';
import { load } from 'js-yaml';
import { ReactiveMap } from '@solid-primitives/map';
import { visit } from 'unist-util-visit';
import toast from 'solid-toast';
import GithubSlugger from 'github-slugger';

import { type RasterImage } from './map';
import { type Group, type Marker, store, getUrl } from './store';
import { createEffectOn, extractText } from './helper';
import { mdastToHtml, sortDescTree } from './transform/markdown';

const mdToMdast = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, 'yaml')
  .use(remarkGfm)
  .use(remarkBreaks);

/** 判断是否含有谷歌地图的链接 */
const hasGoogleMapUrl = (nodeList: RootContent[]) => {
  for (let node of nodeList) {
    if (node.type !== 'paragraph') continue;
    node = node.children[0];
    if (node.type !== 'link') continue;
    node = node.children[0];
    if (node.type === 'text' && node.value === 'Google Map') return true;
  }

  return false;
};

/** 补全并转换远程文档的链接 */
const handleUrl = (urlText: string) => {
  let url: URL;
  if (urlText.startsWith('gh/')) {
    url = new URL(`https://cdn.jsdelivr.net/${urlText}`);
    if (!urlText.endsWith('.md')) url.pathname += '/README.md';
  } else if (urlText.startsWith('http')) {
    url = new URL(urlText);
  } else {
    url = new URL(`http://${urlText}`);
  }

  return url;
};

type State = typeof store & {
  quote?: State;
  tagOrder: Set<string>;
};

export const parseMd = async (
  target: { md: string } | { url: string },
  isQuote = false,
): Promise<State> => {
  const state = {
    md: '',
    name: 'Markdown Map',
    defaultZoom: 15,
    groups: new ReactiveMap<string, Group>(),
    markers: new ReactiveMap<string, Marker>(),
    tagColors: {
      default: '#0288D1',
      '#无坐标': '#4A148C',
    } as Record<string, string>,
    tagOrder: new Set(['default', '#无坐标']),
    rasterImages: [] as RasterImage[],
    baseUrl: store.baseUrl,
    frontmatter: {},
  } as State;

  if ('md' in target) state.md = target.md;
  else {
    const tip = `加载远程文档：\n${decodeURIComponent(target.url)}`;
    toast(tip, {
      position: 'bottom-left',
      id: target.url,
      duration: Number.POSITIVE_INFINITY,
    });

    const url = handleUrl(target.url);
    state.baseUrl = /.+(?=\/)/.exec(url.href)![0];

    try {
      const res = await fetch(url, { cache: 'no-cache' });
      state.md = await res.text();
      toast.success(`${tip}\n加载成功`, { id: target.url, duration: 1000 * 2 });
    } catch (error) {
      console.error(error);
      const errorText = `${tip}\n加载失败：${(error as Error).message}`;
      toast.error(errorText, { id: target.url, duration: 1000 * 3 });
    }
  }

  if (!state.md) return {} as State;

  const root = mdToMdast.parse(state.md);
  const body = root.children;
  if (body.length === 0) return {} as State;

  const markerSlugger = new GithubSlugger();
  const groupSlugger = new GithubSlugger();

  const activeGroup = () => state.groups.get(nowGroup)!;
  const activeMarker = () => state.markers.get(nowMarker)!;

  if (body[0].type === 'yaml') {
    try {
      const data = load(body[0].value) as Record<string, any>;
      state.frontmatter = data;

      // 解析引用文档
      if (Reflect.has(data, 'quoteMd') && typeof data.quoteMd === 'string') {
        state.quote = await parseMd({ url: data.quoteMd }, true);
        Object.assign(state.tagColors, state.quote.tagColors);
        for (const tag of state.quote.tagOrder) state.tagOrder.add(tag);
        state.defaultCenter = state.quote.defaultCenter;
        state.defaultZoom = state.quote.defaultZoom;
        state.rasterImages.concat(state.quote.rasterImages);
      }

      // 设置标签颜色
      if (
        Reflect.has(data, 'tagColors') &&
        typeof data.tagColors === 'object'
      ) {
        for (const [key, value] of Object.entries(
          data.tagColors as Record<string, string>,
        )) {
          const tag = key === 'default' ? key : `#${key}`;
          state.tagColors[tag] = `#${value}`;
          state.tagOrder.add(tag);
        }
      }

      // 设置地图默认中心点
      if (
        Reflect.has(data, 'mapCenter') &&
        typeof data.mapCenter === 'string'
      ) {
        const [lat, lng, zoom] = data.mapCenter.split(',');
        state.defaultCenter = { lat: Number(lat), lng: Number(lng) };
        state.defaultZoom = Number(zoom) || 15;
      }

      // 设置 BaseUrl
      if (Reflect.has(data, 'baseUrl') && typeof data.baseUrl === 'string')
        state.baseUrl = data.baseUrl;

      // 设置 rasterImages
      if (
        Reflect.has(data, 'rasterImages') &&
        Array.isArray(data.rasterImages)
      ) {
        for (const rasterImage of data.rasterImages)
          rasterImage.url = getUrl(rasterImage.url, state.baseUrl);
        state.rasterImages = data.rasterImages;
      }

      toast.dismiss('frontmatter');
    } catch (error) {
      toast.error(`Frontmatter 解析失败：${(error as Error).message}`, {
        id: 'frontmatter',
        duration: Number.POSITIVE_INFINITY,
      });
      console.error('Frontmatter 解析失败', error, body[0].value);
    }
  }

  let nowDepth = 0;
  let nowMarker = '';
  let nowGroup = '';

  const descTree: RootContent[] = [];

  // 将图片链接改成绝对路径
  visit(root, 'image', (node) =>
    Reflect.set(node, 'url', getUrl(node.url, state.baseUrl)),
  );

  const setEnd = (node: RootContent) => {
    const end = node?.position?.end.offset;
    if (end) activeMarker().position.end = end;
  };

  for (const node of body) {
    switch (node.type) {
      case 'heading': {
        switch (node.depth) {
          case 1: {
            state.name = toString(node);
            continue;
          }

          case 2: {
            const name = toString(node);
            const id = groupSlugger.slug(name);

            const group: Group = {
              id,
              name,
              descTree: [],
              desc: '',
              markers: [],
              position: {
                start: node.position!.start.offset!,
                end: node.position!.end.offset!,
              },
            };

            if (state.quote?.groups.has(id)) {
              const quote = state.quote.groups.get(id)!;
              group.descTree = quote.descTree;
            }

            state.groups.set(id, group);
            nowGroup = id;
            break;
          }

          case 3:
          case 4: {
            // 支持 remark-custom-heading-id 格式的标题 ID
            let [, title, , id] = /^(.+?)( {#(.+)})?$/.exec(
              toString(node) ?? 'null',
            )!;
            id = markerSlugger.slug(id || title);

            activeGroup().markers.push(id);

            const markers: Marker = {
              id,
              name: title,
              no: /^\s*(\d+)\./.exec(title)?.[1],
              descTree: [],
              desc: '',
              tags: [],
              isSecondary: node.depth === 4,
              color: '#0288D1',
              group: activeGroup().id,
              position: {
                start: node.position!.start.offset!,
                end: node.position!.end.offset!,
              },
            };

            if (state.quote?.markers.has(id)) {
              const quote = state.quote.markers.get(id)!;
              markers.descTree = quote.descTree;
              markers.tags = quote.tags;
              markers.lngLat = quote.lngLat;
            }

            state.markers.set(id, markers);
            nowMarker = id;
            break;
          }
        }

        nowDepth = node.depth;
        continue;
      }

      case 'html': {
        // 跳过注释
        if (node.value.startsWith(`\u003C!--`)) continue;
        break;
      }
    }

    switch (nowDepth) {
      case 0:
      case 1: {
        descTree.push(node);
        continue;
      }

      case 2: {
        activeGroup().descTree.push(node);
        continue;
      }
    }

    switch (node.type) {
      case 'paragraph': {
        if (
          node.children[0]?.type === 'text' &&
          node.children[0].value.startsWith('#')
        ) {
          // 提取经纬度
          node.children[0].value = extractText(
            node.children[0].value,
            /^#(-?\d+\.\d+, -?\d+\.\d+)$/,
            (_, text) => {
              activeMarker().lngLat = text
                ?.split(',')
                .map(Number)
                // 和谷歌地图上标注的经纬度相反
                .reverse() as [number, number];
            },
          );
          // 提取标签
          node.children[0].value = extractText(
            node.children[0].value,
            /\s?#(\S+)/g,
            (text) => activeMarker().tags.push(text.trim()),
          );
          setEnd(node);
          if (!node.children[0].value) continue;
        }
      }
    }

    activeMarker().descTree.push(node);
    setEnd(node);
  }

  state.desc = mdastToHtml(descTree);

  // 根据标签权重排序
  const tagOrder = Object.fromEntries(
    [...state.tagOrder.values()].map((tag, i) => [tag, i]),
  );

  for (const group of state.groups.values()) {
    group.desc = mdastToHtml(group.descTree);
    const groupEnd = group.descTree.at(-1)?.position?.end.offset;
    if (groupEnd) group.position.end = groupEnd;

    for (const id of group.markers) {
      const marker = state.markers.get(id)!;

      if (!marker.lngLat) marker.tags.push('#无坐标');
      marker.tags = [...new Set(marker.tags)];

      marker.tags.sort(
        (a, b) =>
          (tagOrder[b] ?? Number.NEGATIVE_INFINITY) -
          (tagOrder[a] ?? Number.NEGATIVE_INFINITY),
      );

      // 根据标签设置颜色
      marker.color = state.tagColors[marker.tags[0]] || state.tagColors.default;

      // 为没有谷歌地图的标记点添加对应坐标点的链接
      if (marker.lngLat && !hasGoogleMapUrl(marker.descTree)) {
        const lngLat = `${marker.lngLat[1]}%2C${marker.lngLat[0]}`;
        marker.descTree.push(
          u('paragraph', [
            u('link', {
              url: `https://www.google.com/maps/search/?api=1&query=${lngLat}`,
              children: [u('text', 'Google Map')],
            }),
          ]),
        );
      }

      sortDescTree(marker.descTree);
      marker.desc = mdastToHtml(marker.descTree);
    }
  }

  // 没有设置默认位置的话，就使用第一个地点的位置
  state.defaultCenter ||= state.markers.values().next()?.value?.lngLat;

  // 删掉临时属性
  if (!isQuote) {
    Reflect.deleteProperty(state, 'quote');
    Reflect.deleteProperty(state, 'tagOrder');
  }

  return state;
};

createEffectOn([() => store.name, () => store.isRemote], ([name, isRemote]) => {
  document.title = `${isRemote ? '' : '本地 - '}${name} - Markdown Map`;
});
