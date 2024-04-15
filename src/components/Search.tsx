import SearchSvg from '@material-design-icons/svg/round/search.svg';
import { createSignal, onCleanup, onMount, type Component } from 'solid-js';
import { ReactiveSet } from '@solid-primitives/set';
import { throttle } from '@solid-primitives/scheduled';
import Mark from 'mark.js';
import { produce } from 'solid-js/store';

import { createEffectOn } from '../helper';
import { setState, store } from '../store';

/** 判断文本是否符合匹配条件 */
const matchText = (
  text: string,
  includeList: string[],
  excludeList: string[],
) => {
  const includes = (keyword: string) => text.includes(keyword);
  return includeList.every(includes) && !excludeList.some(includes);
};

let mark: Mark | undefined;

/** 更新搜索关键词高亮 */
const ubdateSearchHighlight = () => {
  mark ||= new Mark(
    document.querySelector<HTMLElement>('#sidebar > .item-list')!,
  );
  mark.unmark();
  for (const keyword of store.search.includeList)
    mark.mark(keyword, { separateWordSearch: false });
};

export const Search: Component = () => {
  let inputRef: HTMLInputElement;

  const [searchText, setSearchText] = createSignal('');

  createEffectOn(
    searchText,
    throttle(() => {
      const keywords = searchText().match(/-?"[^"]*"|[^\s"]+/g);
      if (!keywords) return setState('search', 'markers', undefined);

      setState(
        produce((state) => {
          state.search.includeList.length = 0;
          state.search.excludeList.length = 0;
          for (let keyword of keywords) {
            const isExclude = keyword.startsWith('-');
            if (isExclude) keyword = keyword.slice(1);
            if (keyword.startsWith(`"`) && keyword.endsWith(`"`))
              keyword = keyword.slice(1, -1);
            (isExclude
              ? state.search.excludeList
              : state.search.includeList
            ).push(keyword);
          }

          const res = new ReactiveSet<string>();
          for (const marker of store.markers.values()) {
            const markerMd = store.md.slice(
              marker.position.start,
              marker.position.end,
            );
            if (
              matchText(
                markerMd,
                state.search.includeList,
                state.search.excludeList,
              )
            )
              res.add(marker.id);
          }
          state.search.markers = res;
        }),
      );
      ubdateSearchHighlight();
    }, 200),
    { defer: true },
  );

  createEffectOn(
    [() => store.activeItem, () => store.activeGroup, () => store.md],
    ubdateSearchHighlight,
  );

  const [focus, setFocus] = createSignal(false);
  const handleKeyDown = (e: KeyboardEvent) => {
    if (focus() || store.editMode) return;

    if (e.key === 'f' && e.ctrlKey) {
      e.preventDefault();
      setFocus(true);
      inputRef.focus();
    }
  };
  onMount(() => document.addEventListener('keydown', handleKeyDown));
  onCleanup(() => document.removeEventListener('keydown', handleKeyDown));

  return (
    <input
      ref={inputRef!}
      id="search"
      type="search"
      classList={{
        hidden:
          store.copyMode ||
          (!focus() && !store.editMode && !store.search.markers),
      }}
      placeholder="搜索……"
      onInput={(e) => setSearchText(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    >
      <SearchSvg />
    </input>
  );
};

//
