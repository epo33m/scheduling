/**
 * The api reads its Supabase settings from the environment, and the jest specs
 * sign their own tokens against a local key set. They still need a project URL,
 * because that is where the issuer the api checks comes from, so pin one before
 * AppModule is imported. It overrides rather than defaults: the specs assert
 * against this issuer, so an exported SUPABASE_URL must not change it.
 */
process.env.SUPABASE_URL = 'http://127.0.0.1:54421';
