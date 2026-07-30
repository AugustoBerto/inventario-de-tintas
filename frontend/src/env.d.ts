/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_BASE_URL?: string;
  readonly VITE_PUBLIC_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
