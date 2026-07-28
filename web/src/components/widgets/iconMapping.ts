import { ButtonIcon } from '@/types';

/**
 * Mapping from ButtonIcon names to lucide-react icon component names
 * This allows us to use consistent ButtonIcon names while leveraging lucide-react's icon library
 */
export const buttonIconMap: Record<ButtonIcon, string> = {
  agent: 'Users',
  analytics: 'BarChart',
  atom: 'Atom',
  batch: 'Grid',
  bolt: 'Zap',
  'book-open': 'BookOpen',
  'book-closed': 'Book',
  'book-clock': 'Clock',
  bug: 'Bug',
  calendar: 'Calendar',
  chart: 'BarChart3',
  check: 'Check',
  'check-circle': 'CheckCircle',
  'check-circle-filled': 'CheckCircle2',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'circle-question': 'HelpCircle',
  compass: 'Compass',
  confetti: 'Sparkles',
  cube: 'Cube',
  desktop: 'Monitor',
  document: 'FileText',
  dot: 'CircleDot',
  'dots-horizontal': 'MoreHorizontal',
  'dots-vertical': 'MoreVertical',
  'empty-circle': 'Circle',
  'external-link': 'ExternalLink',
  globe: 'Globe',
  keys: 'Key',
  lab: 'Beaker',
  images: 'Image',
  info: 'Info',
  lifesaver: 'LifeBuoy',
  lightbulb: 'Lightbulb',
  mail: 'Mail',
  'map-pin': 'MapPin',
  maps: 'Map',
  mobile: 'Smartphone',
  name: 'User',
  notebook: 'Notebook',
  'notebook-pencil': 'NotebookPen',
  'page-blank': 'File',
  phone: 'Phone',
  play: 'Play',
  plus: 'Plus',
  profile: 'User',
  'profile-card': 'Card',
  reload: 'RefreshCw',
  star: 'Star',
  'star-filled': 'Star',
  search: 'Search',
  sparkle: 'Sparkles',
  'sparkle-double': 'Zap',
  'square-code': 'CodeSquare',
  'square-image': 'ImageSquare',
  'square-text': 'TextSquare',
  suitcase: 'Briefcase',
  'settings-slider': 'Sliders',
  user: 'User',
  wreath: 'Wreath',
  write: 'Pen',
  'write-alt': 'Edit',
  'write-alt2': 'Pencil',
};

/**
 * Get lucide-react icon component name from ButtonIcon name
 * @param iconName - ButtonIcon name
 * @returns Lucide-react icon component name in PascalCase
 * @example
 * getLucideIconName('plus') // returns 'Plus'
 * getLucideIconName('check-circle') // returns 'CheckCircle'
 */
export function getLucideIconName(iconName: ButtonIcon): string {
  return buttonIconMap[iconName];
}

export default buttonIconMap;
