import exampleMd from '../example.md?raw';

import { setState, store } from './store';
import { createEffectOn, throttle } from './helper';
import { map } from './store/map';
import { fly } from './map';
import { parseMd } from './parseMd';

/** 根据当前状态更新 url */
const updateUrl = throttle(() => {
  const hash = store.activeItem || store.activeGroup;
  if (hash !== location.hash) location.hash = `#${encodeURIComponent(hash)}`;
});

createEffectOn([() => store.activeGroup, () => store.activeItem], updateUrl, {
  defer: true,
});

let lastUrl = '';
/** 根据 url 更新相关状态 */
export const updateState = async () => {
  if (lastUrl !== location.pathname) {
    const isRemote = location.pathname !== '/';
    setState('isRemote', isRemote);

    const target = isRemote
      ? { url: location.pathname.slice(1) }
      : {
          md: lastUrl
            ? store.md
            : localStorage.getItem('md')?.trim() || exampleMd,
        };
    setState(await parseMd(target));
    map.setCenter(store.defaultCenter).setZoom(store.defaultZoom);

    lastUrl = location.pathname;
  }

  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (store.markers.has(id)) {
      if (store.activeItem !== id) fly(id);
    } else if (store.groups.has(id)) {
      setState({ activeGroup: id, activeItem: '' });
    } else updateUrl();
  } else setState({ activeGroup: '', activeItem: '' });
};

window.addEventListener('popstate', updateState);
setTimeout(updateState);
