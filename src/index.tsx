/* @refresh reload */
import { render } from 'solid-js/web';
import { Toaster } from 'solid-toast';

import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import './map';
import './transform/markdown';
import './route';

import 'water.css/out/light.min.css';
import './index.css';

const root = document.querySelector('#root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(
  () => (
    <>
      <Sidebar />
      <Editor />
      <Toaster position="bottom-left" gutter={24} />
    </>
  ),
  root!,
);
