/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ILOVEPDF_KEY: string
  // ... other env vars
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
