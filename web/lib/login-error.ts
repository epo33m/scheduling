/**
 * The reasons /login can give for a refused sign-in. The callback route and the
 * login page both name them, so the vocabulary lives here once: a typo would
 * otherwise reach the page as a missing message.
 */
export const LOGIN_ERRORS = {
  'belum-terdaftar':
    'Akun belum terdaftar. Minta manager menambahkan email kamu ke daftar staf.',
  'tidak-aktif':
    'Akun ini sudah dinonaktifkan. Minta manager mengaktifkannya lagi.',
  gagal: 'Login gagal. Coba masuk sekali lagi.',
} as const;

export type LoginError = keyof typeof LOGIN_ERRORS;

export function readLoginError(
  value: string | string[] | undefined,
): LoginError | undefined {
  return typeof value === 'string' && Object.hasOwn(LOGIN_ERRORS, value)
    ? (value as LoginError)
    : undefined;
}
