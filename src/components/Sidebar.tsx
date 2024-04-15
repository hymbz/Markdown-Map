import EditSvg from '@material-design-icons/svg/round/edit.svg';
import BackSvg from '@material-design-icons/svg/round/arrow_back.svg';
import { type Component, For, Show, onMount, Switch, Match } from 'solid-js';
import mediumZoom from 'medium-zoom';

import 'github-markdown-css/github-markdown-light.css';
import { setState, store } from '../store';
import { boolDataVal } from '../helper';
import './Sidebar.css';
import { fly } from '../map';
import { map } from '../store/map';

import { GroupItem } from './GroupItem';
import { GropuLink } from './GropuLink';
import { Search } from './Search';

const zoom = mediumZoom('.markdown-body img', { background: '#fffe' });
zoom.on('closed', () => zoom.detach());

export const Sidebar: Component = () => {
  onMount(() => map.resize());

  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (target instanceof HTMLImageElement) return zoom.attach(target);

    if (target.tagName === 'A' && target.dataset.href) {
      if (target.dataset.href.startsWith('show:')) {
        // 切换显示地图图片
        const imgName = target.dataset.href.split(':')[1];
        setState(
          'showRasterImage',
          store.showRasterImage === imgName ? '' : imgName,
        );
      } else {
        // 锚点跳转
        const id = target.dataset.href;
        if (store.markers.has(id)) fly(id);
        else if (store.groups.has(id)) setState('activeGroup', id);
      }
    }
  };

  return (
    <div
      id="sidebar"
      class="markdown-body"
      data-copy-mode={boolDataVal(store.copyMode)}
      onClick={handleClick}
    >
      <header>
        <Show when={store.activeGroup}>
          <button
            type="button"
            onClick={() => setState('activeGroup', '')}
            children={BackSvg}
          />
        </Show>
        <span class="truncate">
          {store.groups.get(store.activeGroup)?.name || store.name}
        </span>
        <button
          type="button"
          onClick={() => setState('editMode', (value) => !value)}
          children={EditSvg}
        />
      </header>

      <div
        ref={(reference) => setState('itemListRef', reference)}
        class="item-list beautify-scrollbar"
      >
        <Search />

        <Show when={store.copyMode || !store.activeGroup}>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <div class="desc" innerHTML={store.desc} />
        </Show>

        <Switch>
          {/* 复制模式下显示所有分组 */}
          <Match when={store.copyMode}>
            <For each={[...store.groups.values()]} children={GroupItem} />
          </Match>
          {/* 有 activeGroup 时显示当前分组 */}
          <Match when={store.activeGroup}>
            <GroupItem {...store.groups.get(store.activeGroup)!} />
          </Match>
          {/* 否则显示跳转至分组的链接列表 */}
          <Match when={true}>
            <For each={[...store.groups.values()]} children={GropuLink} />
          </Match>
        </Switch>
      </div>
    </div>
  );
};
