import { type Component, For, Show, createMemo } from 'solid-js';

import { boolDataVal, createEffectOn } from '../helper';
import { type Marker, setState, store } from '../store';
import { fly } from '../map';

const Tag = (name: string) => (
  <span
    class="tag"
    style={{
      'background-color': store.tagColors[name] ?? store.tagColors.default,
    }}
    children={name}
  />
);

export const Item: Component<Marker> = (props) => {
  let ref: HTMLDivElement;
  let inputRef: HTMLInputElement;

  const isShow = createMemo(
    () => !store.search.markers || store.search.markers.has(props.id),
  );

  const isOpen = createMemo(
    () =>
      store.copyMode ||
      Boolean(store.search.markers) ||
      (isShow() && props.id === store.activeItem),
  );

  const isDone = createMemo(() => !isOpen() && store.doneMarkers.has(props.id));

  createEffectOn(isDone, (val) => Reflect.set(inputRef, 'checked', val));

  const handleCheckBoxClick = (e: MouseEvent) => {
    e.stopPropagation();

    const action = store.doneMarkers.has(props.id)
      ? store.doneMarkers.delete.bind(store.doneMarkers)
      : store.doneMarkers.add.bind(store.doneMarkers);

    action(props.id);
    // 一并处理后续的子标记
    if (!props.isSecondary) {
      let flag = false;
      for (const marker of store.markers.values()) {
        if (marker.id === props.id) {
          flag = true;
          continue;
        }

        if (!flag) continue;
        if (marker.isSecondary) action(marker.id);
        else break;
      }
    }
  };

  return (
    <div
      ref={ref!}
      class="item"
      classList={{ hidden: !isShow(), 'is-done': isDone() }}
      data-id={props.id}
      data-is-secondary={boolDataVal(props.isSecondary)}
      data-open={boolDataVal(isOpen())}
      onMouseEnter={() => setState('hoverItem', props.id)}
      onMouseLeave={() => setState('hoverItem', '')}
    >
      <div class="item-name" onClick={() => fly(props.id)}>
        <input
          ref={inputRef!}
          type="checkbox"
          classList={{
            hidden: !store.editMode && store.doneMarkers.size === 0,
          }}
          onClick={handleCheckBoxClick}
        />
        <h3 children={props.name} />
        <Show when={props.tags.length}>
          <div class="tags">
            <For each={props.tags} children={Tag} />
          </div>
        </Show>
      </div>
      <div
        class="desc"
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={props.desc}
        onClick={() => isOpen() || fly(props.id)}
      />
    </div>
  );
};
