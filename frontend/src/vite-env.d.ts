/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL da API em produção, ex.: https://janepacheco-api.onrender.com */
  readonly VITE_API_URL?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
