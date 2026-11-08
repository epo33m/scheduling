const FALLBACK = '/';

/**
 * Backslash breaks the host on some browsers, and control characters are
 * stripped by the URL parser, which turns `/\t/host` back into `//host`.
 */
const UNSAFE = /[\\\u0000-\u001f\u007f]/;

/**
 * Where login sends someone once they are through. The value comes from a URL,
 * so anything that is not a plain same-site path is dropped: an absolute or
 * protocol-relative URL here would turn the login form into an open redirect.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) {
    return FALLBACK;
  }

  // `//host` is protocol-relative, and browsers read `/\host` the same way.
  if (value.startsWith('//') || UNSAFE.test(value)) {
    return FALLBACK;
  }

  return value;
}
