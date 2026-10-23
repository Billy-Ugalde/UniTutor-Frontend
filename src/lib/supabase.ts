import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas.',
  )
}

const supabaseHost = new URL(supabaseUrl).host
const CLIENT_SIGNATURE =
  (import.meta.env.VITE_SUPABASE_CLIENT_SIGNATURE as string | undefined) ||
  'unitutor-system-client/1.0'
const INTERNAL_STORAGE_PREFIX = '__ut_sys_session_'

// Captura privada del fetch nativo antes de instalar los bloqueos de consola.
const nativeFetch: typeof fetch =
  (import.meta.hot?.data?.nativeFetch as typeof fetch | undefined) ??
  globalThis.fetch.bind(globalThis)

if (import.meta.hot) {
  import.meta.hot.data.nativeFetch = nativeFetch
}

let allowStorageAccess = false
const memorySessionStore = new Map<string, string>()

function getCipherSecret(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unitutor'
  return `${origin}::${supabaseHost}::${CLIENT_SIGNATURE}`
}

function obfuscateValue(plain: string): string {
  const secret = getCipherSecret()
  const bytes = new TextEncoder().encode(plain)
  const keyBytes = new TextEncoder().encode(secret)
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff)
  }
  let binary = ''
  for (let i = 0; i < out.length; i++) {
    binary += String.fromCharCode(out[i])
  }
  return btoa(binary)
}

function deobfuscateValue(encoded: string): string | null {
  try {
    const binary = atob(encoded)
    const secret = getCipherSecret()
    const keyBytes = new TextEncoder().encode(secret)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i) ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff)
    }
    return new TextDecoder().decode(out)
  } catch {
    return null
  }
}

function isSupabaseUrl(input: RequestInfo | URL | string): boolean {
  try {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const parsed = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : undefined)
    return parsed.host === supabaseHost
  } catch {
    return String(input).includes(supabaseHost)
  }
}

function isConsoleEvaluatedCall(): boolean {
  const stack = new Error().stack ?? ''
  if (!stack) return false
  const hasConsoleMarker =
    /debugger eval code|@console|(?:\bVM\d+:\d+)|(?:^\s*at <anonymous>:\d+:\d+)/m.test(stack)
  if (!hasConsoleMarker) return false
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const hasAppOriginFrame = origin ? stack.includes(origin) : true
  return !hasAppOriginFrame
}

// Instala protecciones en el navegador para bloquear llamadas directas desde DevTools / consola.
if (typeof window !== 'undefined' && !import.meta.hot?.data?.guardsInstalled) {
  if (import.meta.hot) {
    import.meta.hot.data.guardsInstalled = true
  }

  // 1. Limpiar cualquier token en texto plano heredado (sb-*-auth-token) en localStorage/sessionStorage.
  try {
    const defaultSbKey = `sb-${ supabaseHost.split('.')[0] }-auth-token`
    const legacyRaw = window.localStorage.getItem(defaultSbKey)
    if (legacyRaw) {
      const internalKey = `${INTERNAL_STORAGE_PREFIX}${defaultSbKey}`
      const encoded = obfuscateValue(legacyRaw)
      memorySessionStore.set(internalKey, encoded)
      window.sessionStorage.setItem(internalKey, encoded)
      window.localStorage.removeItem(defaultSbKey)
    }
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        window.localStorage.removeItem(k)
      }
    }
  } catch {
    // Ignorar si el almacenamiento está restringido por el navegador.
  }

  // 2. Proteger Storage para impedir lectura de la sesión interna desde la consola.
  const rawGetItem = Storage.prototype.getItem
  const rawSetItem = Storage.prototype.setItem
  const rawRemoveItem = Storage.prototype.removeItem

  Storage.prototype.getItem = function (key: string): string | null {
    if (String(key).startsWith(INTERNAL_STORAGE_PREFIX) && !allowStorageAccess) {
      return null
    }
    return rawGetItem.call(this, key)
  }

  Storage.prototype.setItem = function (key: string, value: string): void {
    if (String(key).startsWith(INTERNAL_STORAGE_PREFIX) && !allowStorageAccess) {
      throw new Error('Acceso no autorizado al almacenamiento protegido del sistema.')
    }
    rawSetItem.call(this, key, value)
  }

  Storage.prototype.removeItem = function (key: string): void {
    if (String(key).startsWith(INTERNAL_STORAGE_PREFIX) && !allowStorageAccess) {
      throw new Error('Acceso no autorizado al almacenamiento protegido del sistema.')
    }
    rawRemoveItem.call(this, key)
  }

  // 3. Bloquear window.fetch directo hacia Supabase desde la consola o scripts externos.
  const guardedFetch: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (isSupabaseUrl(input)) {
      return Promise.reject(
        new Error(
          'Acceso no autorizado: las llamadas directas a Supabase fuera del sistema están bloqueadas.',
        ),
      )
    }
    return nativeFetch(input, init)
  }

  try {
    Object.defineProperty(window, 'fetch', {
      value: guardedFetch,
      writable: false,
      configurable: false,
    })
  } catch {
    window.fetch = guardedFetch
  }

  // 4. Bloquear XMLHttpRequest directo hacia Supabase.
  const rawXhrOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    if (isSupabaseUrl(url)) {
      throw new Error(
        'Acceso no autorizado: las solicitudes XHR directas a Supabase están bloqueadas.',
      )
    }
    return rawXhrOpen.call(this, method, url, async ?? true, username, password)
  }

  // 5. Bloquear navigator.sendBeacon directo hacia Supabase.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const rawSendBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
      if (isSupabaseUrl(url)) {
        throw new Error(
          'Acceso no autorizado: el envío directo a Supabase está bloqueado.',
        )
      }
      return rawSendBeacon(url, data)
    }
  }
}

const secureAuthStorage = {
  getItem(key: string): string | null {
    const internalKey = `${INTERNAL_STORAGE_PREFIX}${key}`
    let encoded = memorySessionStore.get(internalKey) ?? null
    if (!encoded && typeof window !== 'undefined') {
      allowStorageAccess = true
      try {
        encoded =
          window.sessionStorage.getItem(internalKey) ??
          window.localStorage.getItem(internalKey)
        if (encoded) {
          memorySessionStore.set(internalKey, encoded)
        }
      } finally {
        allowStorageAccess = false
      }
    }
    if (!encoded) return null
    return deobfuscateValue(encoded)
  },
  setItem(key: string, value: string): void {
    const internalKey = `${INTERNAL_STORAGE_PREFIX}${key}`
    const encoded = obfuscateValue(value)
    memorySessionStore.set(internalKey, encoded)
    if (typeof window !== 'undefined') {
      allowStorageAccess = true
      try {
        window.sessionStorage.setItem(internalKey, encoded)
        window.localStorage.setItem(internalKey, encoded)
      } finally {
        allowStorageAccess = false
      }
    }
  },
  removeItem(key: string): void {
    const internalKey = `${INTERNAL_STORAGE_PREFIX}${key}`
    memorySessionStore.delete(internalKey)
    if (typeof window !== 'undefined') {
      allowStorageAccess = true
      try {
        window.sessionStorage.removeItem(internalKey)
        window.localStorage.removeItem(internalKey)
      } finally {
        allowStorageAccess = false
      }
    }
  },
}

const authorizedFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (isConsoleEvaluatedCall()) {
    throw new Error(
      'Acceso no autorizado: no se permiten llamadas desde la terminal del navegador.',
    )
  }

  const headers = new Headers(init?.headers)
  headers.set('X-Client-Info', CLIENT_SIGNATURE)

  return nativeFetch(input, {
    ...init,
    headers,
  })
}

const rawClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: authorizedFetch,
    headers: {
      'X-Client-Info': CLIENT_SIGNATURE,
    },
  },
})

const ALLOWED_CLIENT_PROPS = new Set<string | symbol>([
  'auth',
  'from',
  'rpc',
  'channel',
  'removeChannel',
])

export const supabase: SupabaseClient = new Proxy(rawClient, {
  get(target, prop) {
    if (!ALLOWED_CLIENT_PROPS.has(prop)) {
      return undefined
    }
    if (isConsoleEvaluatedCall()) {
      throw new Error(
        'Acceso no autorizado: el cliente de Supabase solo puede ser invocado por el sistema.',
      )
    }
    const value = Reflect.get(target, prop, target)
    return typeof value === 'function' ? value.bind(target) : value
  },
  set() {
    return false
  },
  deleteProperty() {
    return false
  },
  ownKeys() {
    return Array.from(ALLOWED_CLIENT_PROPS) as string[]
  },
})
