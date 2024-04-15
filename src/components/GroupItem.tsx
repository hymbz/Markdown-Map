import { type Component, For, Show } from 'solid-js';

import { type Group, store, getMarker } from '../store';

import { Item } from './Item';

export const GroupItem: Component<Group> = (props) => (
  <>
    <Show when={store.copyMode} children={<h2>{props.name}</h2>} />
    <Show when={props?.desc}>
      {/* eslint-disable-next-line solid/no-innerhtml */}
      <div class="desc" innerHTML={props.desc} />
    </Show>
    <For each={props.markers?.map((id) => getMarker(id)!)} children={Item} />
  </>
);
