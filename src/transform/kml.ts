import { XMLParser } from 'fast-xml-parser';
import { u } from 'unist-builder';
import { x } from 'xastscript';
import { toXml } from 'xast-util-to-xml';
import toast from 'solid-toast';
import type { Element } from 'xastscript/lib';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Image, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

import { type Group, store } from '../store';
import { saveAs } from '../helper';

export const KmlMime = 'application/vnd.google-earth.kml+xml';

export interface PlacemarkNode {
  name: string;
  description: string;
  styleUrl: string;
  Point: { coordinates: string };
}

export interface PlacemarkDocument {
  name: string;
  Placemark: PlacemarkNode[];
}

export interface FolderDocument {
  name: string;
  description: string;
  Folder: PlacemarkDocument[];
}

export type KMLDocument = FolderDocument | PlacemarkDocument;

const placemarkToMd = ({ name, Placemark }: PlacemarkDocument) => {
  let md = `## ${name}\n\n`;

  for (const place of Placemark) {
    const level = place.styleUrl.startsWith('#icon-1739') ? '####' : '###';
    const name = place.name.replaceAll('\n', ' ');
    const desc = place.description
      ?.replaceAll(/<img .*?src="(.+?)".*?>/g, '![]($1)')
      .replaceAll('<br>', '\n');
    if (!Reflect.has(place, 'Point')) continue;
    const lngLat = place.Point.coordinates
      .slice(0, -2)
      .split(',')
      .reverse()
      .join(', ');
    md += `${level} ${name}\n\n${desc ?? ''}\n\n#${lngLat}\n\n`;
  }

  return md;
};

/** 将谷歌地图的标记点描述转换为 Markdown 格式 */
const googleDescToMd = (html: string) =>
  html
    .replaceAll(/<img .*?src="(.+?)".*?>/g, '![]($1)')
    .replaceAll('<br>', '\n')
    .trim();

export const kmlToMd = (kmlText: string, fileName: string) => {
  const parser = new XMLParser();
  const xml = parser.parse(kmlText);

  const document = xml?.kml?.Document as KMLDocument | undefined;
  if (!document) return '';

  let md = '';
  if ('Folder' in document) {
    let { Folder: folderNode, name, description } = document;
    if (!Array.isArray(folderNode)) folderNode = [folderNode];

    md += `# ${name || fileName}\n\n${googleDescToMd(description)}\n\n`;
    for (const node of folderNode) md += placemarkToMd(node);
  } else if ('Placemark' in document) {
    if (!Array.isArray(document.Placemark))
      document.Placemark = [document.Placemark];
    md = placemarkToMd(document);
  } else {
    toast.error('无法解析 KML 文件');
    throw new Error('无法解析 KML 文件');
  }

  return md;
};

/** 将 mdast 转换为谷歌地图的标记点描述 */
const mdastToGoogleDesc = (nodeList: RootContent[]) => {
  const tree = u('root', JSON.parse(JSON.stringify(nodeList)));
  const imgList: Image[] = [];

  // 将图片改成文字
  visit(tree, 'image', (node) => {
    imgList.push({ ...node });
    Object.assign(node, u('text', `${node.alt}（图片${imgList.length}）`));
  });

  visit(tree, 'link', (node) => {
    if (!node.url.startsWith('#')) return;
    Object.assign(node, u('text', `${toString(node)}`));
  });

  let md = toMarkdown(tree);
  // 加上图片元素让谷歌识别
  md += imgList.map((node) => `<img src="${node.url}" />`).join('');

  return md;
};

const markerToPlacemark = (id: string): Element | undefined => {
  const marker = store.markers.get(id);
  if (!marker?.lngLat) return;

  const iconType = marker.isSecondary ? '1739' : '1499';
  const desc = mdastToGoogleDesc(marker.descTree);

  return x('Placemark', [
    x('name', marker.name),
    x('description', [
      u('raw', `<![CDATA[${desc.replaceAll('\n', '<br>')}]]>`),
    ]),
    x('styleUrl', `#icon-${iconType}-${marker.color.slice(1)}-nodesc`),
    x('Point', [x('coordinates', [...marker.lngLat, 0].join(','))]),
  ]);
};

const createStyle = (id: string, type: 'normal' | 'highlight') =>
  x('Style', { id: `${id}-${type}` }, [
    x('IconStyle', [x('scale', 1), x('Icon', [x('href', '')])]),
    x('LabelStyle', [x('scale', type === 'normal' ? 0 : 1)]),
  ]);

const groupToKml = (group: Group) => {
  const groupXML = group.markers.map(markerToPlacemark);

  const styleList = new Set<string>();
  // 找出所有图标 id
  for (const placemark of groupXML) {
    if (!placemark) continue;
    for (const child of placemark.children) {
      if (
        child.type === 'element' &&
        child.name === 'styleUrl' &&
        child.children[0].type === 'text'
      )
        styleList.add(child.children[0].value);
    }
  }

  const styleXML = [...styleList].flatMap((styleId) => {
    const id = styleId.slice(1);
    return [
      createStyle(id, 'normal'),
      createStyle(id, 'highlight'),
      x('StyleMap', { id }, [
        x('Pair', [x('key', 'normal'), x('styleUrl', `#${id}-normal`)]),
        x('Pair', [x('key', 'highlight'), x('styleUrl', `#${id}-highlight`)]),
      ]),
    ];
  });

  return toXml(
    u('root', [
      u('instruction', { name: 'xml' }, 'version="1.0" encoding="UTF-8"'),
      x('kml', { xmlns: 'http://www.opengis.net/kml/2.2' }, [
        x('Document', [x('name', group.name), ...styleXML, ...groupXML]),
      ]),
    ]),
    { allowDangerousXml: true },
  );
};

export const exportKml = async () => {
  for (const group of store.groups.values()) {
    saveAs(
      new Blob([groupToKml(group)], { type: 'KmlMime' }),
      `${group.name}.kml`,
    );
  }
};
