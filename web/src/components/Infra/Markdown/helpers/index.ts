import { UAParser } from 'ua-parser-js';
const parser = new UAParser(window?.navigator?.userAgent);

export const getDevice = () => {
  return parser.getDevice()?.type || 'desktop';
};
