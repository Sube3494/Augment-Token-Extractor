export const CLIENT_ID = 'v'
export const AUTH_BASE_URL = 'https://auth.augmentcode.com'

export function base64UrlEncode(bytes: ArrayBuffer | Uint8Array | string) {
  const bin = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bin)
  let str = btoa(String.fromCharCode(...u8))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function randomBytes(len: number) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return arr
}

export async function sha256Base64Url(inputStr: string) {
  const data = new TextEncoder().encode(inputStr)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

