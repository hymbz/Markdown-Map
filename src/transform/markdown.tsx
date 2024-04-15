import { unified } from 'unified';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw';
import remarkRehype from 'remark-rehype';
import type { HastRoot } from 'remark-rehype/lib';
import type { RootContent } from 'mdast';
import { u } from 'unist-builder';
import { toHtml } from 'hast-util-to-html';
import { visit, SKIP } from 'unist-util-visit';
import { h } from 'hastscript';
import toast from 'solid-toast';
import { ceil } from 'lodash';

import { getUrl, setState, store } from '../store';
import { cloneDeep, getExtName, getImgSize, plimit } from '../helper';
import { map } from '../store/map';

const googleUrlList = [
  'https://maps.app.goo.gl',
  'https://www.google.com/maps',
];

const handleHtml = () => (tree: HastRoot) => {
  visit(tree, 'element', (node, index, parent) => {
    switch (node.tagName) {
      case 'p': {
        // 如果当前 p 下有 img，那就删掉 p 放出 img
        if (
          node.children.some(
            (child) => child.type === 'element' && child.tagName === 'img',
          )
        ) {
          parent!.children.splice(index!, 1, ...node.children);
          return [SKIP, index];
        }

        return;
      }

      case 'img': {
        const alt = node.properties.alt as string | undefined;
        const title = node.properties.title as string | undefined;
        if (title && /^\d+x\d+$/.test(title)) {
          const size = title.split('x').map(Number);
          node.properties.width = size[0];
          node.properties.height = size[1];
        }

        // 修改图片标题
        node.properties.title = alt;
        // 图片懒加载
        node.properties['data-src'] = node.properties.src;
        node.properties.src = undefined;
        node.properties.class = `${(node.properties.class as string) ?? ''} lazyload`;
        node.properties.decoding = 'async';

        // 包装 img
        const picture = h('picture.medium-zoom-image');
        const src = node.properties['data-src'] as string;
        if (getExtName(src) === 'avif') {
          const webp = cloneDeep(node);
          webp.properties['data-src'] = src.replace(/\.avif(?=\?|$)/, '.webp');
          picture.children = [
            h('source', { 'data-srcset': src, type: 'image/avif' }),
            webp,
          ];
        } else picture.children = [{ ...node }];

        node.tagName = 'figure';
        node.properties = {};
        node.children = [picture];
        if (alt && src) node.children.push(h('figcaption', alt));

        return SKIP;
      }

      case 'a': {
        const href = node.properties.href as string | undefined;

        // 为谷歌地图的链接加上样式
        if (index === 0 && googleUrlList.some((gUrl) => href?.startsWith(gUrl)))
          node.properties.class = 'map-link';

        // 跳转至新页面
        if (node.properties.target !== '_blank')
          node.properties.target = '_blank';

        // 禁用特殊超链接的跳转
        if (href?.[0] === '#') {
          node.properties['data-href'] = decodeURIComponent(href.slice(1));
          node.properties.href = 'javascript:void(0);';
          node.properties.target = undefined;
        }
      }
    }
  });
};

const _mdastToHtml = unified()
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize)
  .use(handleHtml);
export const mdastToHtml = (nodeList: RootContent[]) =>
  toHtml(_mdastToHtml.runSync(u('root', nodeList)));

/** 判断元素节点是否应该位于底部 */
const isBottomNode = (node: RootContent) =>
  node.type === 'paragraph' &&
  node.children.length === 1 &&
  node.children[0].type === 'link' &&
  node.children[0].children[0].type === 'text' &&
  (node.children[0].children[0].value === 'Google Map' ||
    node.children[0].children[0].value.startsWith('by '));

/** 对标记点描述进行排序，确保某些元素始终位于底部 */
export const sortDescTree = (descTree: RootContent[]) => {
  let bottomItemNum = -1;

  for (const [i, node] of descTree.entries()) {
    if (bottomItemNum === -1) {
      if (isBottomNode(node)) bottomItemNum = i;
    } else if (!isBottomNode(node)) {
      descTree.splice(i, 1);
      descTree.splice(bottomItemNum, 0, node);
      bottomItemNum += 1;
    }
  }

  return descTree;
};

/** 更新文档中所有未标明图片尺寸的图片 */
export const updateImgSize = async () => {
  let md = store.md;

  await plimit(
    [...store.md.matchAll(/!\[(.*?)]\((.+?)( "(\d+x\d+)")?\)/g)].map(
      ([text, alt, url]) =>
        async () => {
          const size = await getImgSize(getUrl(url));
          if (!size) return;
          const newImgText = `![${alt}](${url} "${size[0]}x${size[1]}")`;
          if (newImgText === text) return;
          md = md.replace(text, newImgText);
        },
    ),
    (done, total) =>
      toast(`获取图片尺寸：${done}/${total}`, { id: 'updateImgSize' }),
  );

  setState('md', md);
  toast.success('图片尺寸更新完成', { id: 'updateImgSize' });
};

declare const uploadSMMS: (options: {
  blob: Blob;
  token: string;
  on?: (url: string, res: any) => unknown | Promise<unknown>;
}) => Promise<string>;

export const updateImgSMMS = async () => {
  if (!store.frontmatter.SMMS) return toast.error('未配置 SMMS Token');

  let md = store.md;

  const imgUrlList = [
    ...store.md.matchAll(/!\[(.*?)]\((.+?)( "(\d+x\d+)")?\)/g),
  ];
  const total = imgUrlList.length;
  let done = 0;
  for (const [text, alt, url, , title] of imgUrlList) {
    done += 1;
    if (url.includes('.loli.net/')) continue;

    const res = await fetch(getUrl(url));
    const blob = await res.blob();

    let newUrl: string;
    try {
      newUrl = await uploadSMMS({
        blob,
        token: store.frontmatter.SMMS,
        on: (url, { code }) => toast.success(`${code}: ${url}`),
      });
    } catch (error) {
      toast.error(`图片上传失败\n${(error as Error).message}`);
      break;
    }

    toast(`上传图床图片：${done}/${total}`, { id: 'updateImgSMMS' });
    const newImgText = `![${alt}](${newUrl} "${title}")`;
    if (newImgText === text) continue;
    md = md.replace(text, newImgText);
  }

  if (done === total) {
    toast.success('所有图片均已上传至图床', { id: 'updateImgSMMS' });
    // 上传完成后把 token 删掉
    md = md.replace(`\nSMMS: ${store.frontmatter.SMMS}`, '');
  } else {
    toast.error(`剩余 ${total - done - 1} 张图片未上传，将在5分钟后重试`, {
      id: 'updateImgSMMS',
    });
    setTimeout(updateImgSMMS, 5 * 60 * 1000);
  }

  setState('md', md);
};

/** 复制可以被微博文章支持的 HTML 格式 */
export const copyHTML = async () => {
  setState('copyMode', true);

  const range = document.createRange();
  range.selectNodeContents(store.itemListRef!);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('Copy');

  window.getSelection()!.removeAllRanges();
  setState('copyMode', false);
  toast.success('复制成功');
};

/** 将当前视图设置为初始视图 */
export const setMapCenter = () => {
  const zoom = ceil(map.getZoom(), 2);
  const { lat, lng } = map.getCenter();
  const text = `mapCenter: ${ceil(lat, 6)},${ceil(lng, 6)},${zoom}\n`;
  setState('md', (md) => md.replace(/mapCenter:.+?\n|(?<=---\n)/, text));
};
