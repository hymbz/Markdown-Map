import { CodeJar } from 'codejar';
import { type HighlighterGeneric, getHighlighterCore } from 'shiki/core';
import getWasm from 'shiki/wasm';
import { throttle } from '@solid-primitives/scheduled';

import { debounce, scrollIntoView } from '../helper';
import { parseMd } from '../parseMd';

import { setState, store } from '.';

let jar: CodeJar;

export const initJar = async (editorRef: HTMLElement) => {
  const highlighter = (await getHighlighterCore({
    themes: [import('shiki/themes/one-dark-pro.mjs')],
    langs: [import('shiki/langs/markdown.mjs'), import('shiki/langs/yaml.mjs')],
    loadWasm: getWasm,
  })) as HighlighterGeneric<any, any>;

  const highlight = (editor: HTMLElement) => {
    if (!editor.textContent) return;
    editor.innerHTML = highlighter.codeToHtml(editor.textContent ?? '', {
      lang: 'markdown',
      theme: 'one-dark-pro',
    });
  };

  jar = CodeJar(editorRef, highlight, { tab: '  ' });
  jar.updateCode(store.md);

  const setEditEnd = debounce(() => setState('isEditing', false), 1000);

  const handleUpdate = async (code: string) => {
    if (code === store.md) return;

    setState(await parseMd({ md: code }));

    if (!store.isEditing) setState('isEditing', true);
    setEditEnd();
  };

  jar.onUpdate(throttle(handleUpdate, 200));
  return jar;
};

/** 滚动编辑器显示当前条目 */
export const scrollEditor = () => {
  if (
    !jar ||
    !store.activeItem ||
    document.activeElement?.classList.contains('editor')
  )
    return;

  const marker = store.markers.get(store.activeItem)!;
  jar.restore(marker.position);

  const element = getSelection()?.getRangeAt(0).startContainer
    .parentNode as HTMLElement;
  if (!element) return;
  scrollIntoView(element, 'center');
};
