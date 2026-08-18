export function isDevOrTest() {
  return window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development';
}
