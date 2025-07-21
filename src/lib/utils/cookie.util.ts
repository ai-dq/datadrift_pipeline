/**
 * Get a cookie value by name
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }

  return null;
}

/**
 * Set a cookie
 * @param name Cookie name
 * @param value Cookie value
 * @param days Days until expiration (optional)
 */
export function setCookie(name: string, value: string, days?: number): void {
  if (typeof document === 'undefined') {
    return;
  }

  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  document.cookie = `${name}=${value}${expires}; path=/`;
}

/**
 * Delete a cookie
 * @param name Cookie name
 */
export function deleteCookie(name: string): void {
  setCookie(name, '', -1);
}
