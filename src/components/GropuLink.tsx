import ArrowRightAltSvg from '@material-design-icons/svg/round/arrow_right.svg';
import { type Component, createMemo } from 'solid-js';

import { type Group, store, setState } from '../store';
import { createEffectOn } from '../helper';

/** 跳转至分组的链接列表 */
export const GropuLink: Component<Group> = (props) => {
  let inputRef: HTMLInputElement;

  const showSize = createMemo(() => {
    if (!store.search.markers) return props.markers.length;
    return props.markers.filter((marker) => store.search.markers?.has(marker))
      .length;
  });

  const doneSize = createMemo(() => {
    if (store.doneMarkers.size === 0) return 0;
    return props.markers.filter((marker) => store.doneMarkers.has(marker))
      .length;
  });

  createEffectOn(doneSize, (doneNum) => {
    inputRef.checked = doneNum === showSize();
    inputRef.indeterminate = !inputRef.checked && doneNum !== 0;
  });

  const tip = createMemo(() => {
    if (props.markers.length === 0) return '';
    return `${doneSize() ? `${doneSize()}/` : ''}${showSize()} 处标记`;
  });

  const show = () =>
    store.editMode || (!store.search.markers && !tip()) || showSize();

  const handleClick = () => {
    setState('activeGroup', props.id);
    store.itemListRef?.scrollTo(0, 0);
  };

  const handleCheckBoxClick = (e: MouseEvent) => {
    e.stopPropagation();

    const action = doneSize()
      ? store.doneMarkers.delete.bind(store.doneMarkers)
      : store.doneMarkers.add.bind(store.doneMarkers);
    props.markers.forEach(action);
  };

  return (
    <div
      class="item"
      classList={{
        hidden: !show(),
        'is-done': Boolean(showSize()) && doneSize() === showSize(),
      }}
      onClick={handleClick}
    >
      <div class="item-name">
        <input
          ref={inputRef!}
          type="checkbox"
          classList={{
            hidden: !tip() || !(store.editMode || store.doneMarkers.size > 0),
          }}
          onClick={handleCheckBoxClick}
        />
        <h3 class="truncate" children={props.name} />
        <div class="tags" children={tip()} />
        <ArrowRightAltSvg />
      </div>
      <div class="desc" />
    </div>
  );
};
