import { type Component, onMount, For } from 'solid-js';
import { type CodeJar, type Position } from 'codejar';
import { fileOpen } from 'browser-fs-access';

import { loadExample, setState, store } from '../store';
import { createEffectOn, debounce, singleThread } from '../helper';
import {
  copyHTML,
  setMapCenter,
  updateImgSMMS,
  updateImgSize,
} from '../transform/markdown';
import { KmlMime, exportKml, kmlToMd } from '../transform/kml';
import { initJar, scrollEditor } from '../store/codeJat';
import './Editor.css';

export const Editor: Component = () => {
  let editorRef: HTMLDivElement;

  let jar: CodeJar;

  onMount(async () => {
    jar = await initJar(editorRef);
  });

  const importKML = async () => {
    const file = await fileOpen({ mimeTypes: [KmlMime] });
    const text = await file.text();
    jar.updateCode(kmlToMd(text, file.name));
  };

  /** 根据当前光标所在位置找到对应的条目跳转过去 */
  const handleClick = () => {
    const pos = jar.save().start;

    for (const marker of store.markers.values())
      if (marker.position.start <= pos && marker.position.end + 1 >= pos)
        return setState('activeItem', marker.id);

    for (const group of store.groups.values())
      if (group.position.start <= pos && group.position.end + 1 >= pos)
        return setState({ activeGroup: group.id, activeItem: '' });

    setState({ activeGroup: '', activeItem: '' });
  };

  createEffectOn(
    () => store.editMode,
    (editMode) => editMode && scrollEditor(),
  );

  createEffectOn(
    () => store.md,
    debounce(() => {
      if (!jar || store.isEditing || jar.toString() === store.md) return;

      let pos: false | Position = false;
      try {
        pos = store.editMode && jar.save();
      } catch {}

      try {
        jar.updateCode(store.md);
        if (pos) jar.restore(pos);
      } catch {}
    }, 500),
  );

  const buttons: Record<string, () => unknown> = {
    示例: loadExample,
    导入KML: importKML,
    导出KML: exportKml,
    更新图片尺寸: updateImgSize,
    设为初始视图: setMapCenter,
    复制HTML: copyHTML,
  };
  if (Reflect.has(window, 'uploadSMMS'))
    buttons['迁移至 SM.MS'] = updateImgSMMS;

  return (
    <div id="editor" classList={{ hidden: !store.editMode }}>
      <div
        ref={editorRef!}
        class="editor beautify-scrollbar"
        onClick={handleClick}
      />
      <div class="toolbar">
        <For each={Object.entries(buttons)}>
          {([text, fn]) => (
            <button type="button" onClick={singleThread(fn)} innerText={text} />
          )}
        </For>
      </div>
    </div>
  );
};
