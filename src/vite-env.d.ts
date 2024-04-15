// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly AccessToken: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
