export function isDevOrTest() {
  return (
    window.location.host === 'console-boe.lingyiwanwu.net' ||
    process.env.NODE_ENV === 'development' ||
    window.location.host === 'test-app.lingyiwanwu.net'
  );
}
