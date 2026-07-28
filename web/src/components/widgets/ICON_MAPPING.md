# Button Icon Mapping

## Overview

This document explains the icon mapping system used in the Button component. ButtonIcon names are mapped to lucide-react icon component names, allowing consistent naming while leveraging the lucide-react icon library.

## How It Works

1. **ButtonIcon Type** (`types/widget.ts`) - Defines available icon names
2. **Icon Mapping** (`iconMapping.ts`) - Maps ButtonIcon names to lucide-react components
3. **Button Component** (`Button.tsx`) - Uses the mapping to render icons dynamically

## Icon Mapping Reference

| ButtonIcon          | Lucide-React Icon | Description               |
| ------------------- | ----------------- | ------------------------- |
| agent               | Users             | Multiple users/team       |
| analytics           | BarChart          | Analytics/chart data      |
| atom                | Atom              | Atom/molecular structure  |
| batch               | Grid              | Grid/batch processing     |
| bolt                | Zap               | Lightning bolt/energy     |
| book-open           | BookOpen          | Open book                 |
| book-closed         | Book              | Closed book               |
| book-clock          | Clock             | Clock/time                |
| bug                 | Bug               | Bug/error                 |
| calendar            | Calendar          | Calendar/date             |
| chart               | BarChart3         | Chart/statistics          |
| check               | Check             | Checkmark                 |
| check-circle        | CheckCircle       | Check with circle         |
| check-circle-filled | CheckCircle2      | Filled check circle       |
| chevron-left        | ChevronLeft       | Left chevron              |
| chevron-right       | ChevronRight      | Right chevron             |
| circle-question     | HelpCircle        | Question circle/help      |
| compass             | Compass           | Compass/navigation        |
| confetti            | Sparkles          | Confetti/celebration      |
| cube                | Cube              | 3D cube                   |
| desktop             | Monitor           | Desktop/screen            |
| document            | FileText          | Document/text file        |
| dot                 | CircleDot         | Dot/bullet point          |
| dots-horizontal     | MoreHorizontal    | More options (horizontal) |
| dots-vertical       | MoreVertical      | More options (vertical)   |
| empty-circle        | Circle            | Empty circle              |
| external-link       | ExternalLink      | External link             |
| globe               | Globe             | Globe/world               |
| keys                | Key               | Keys/keyboard             |
| lab                 | Beaker            | Laboratory/beaker         |
| images              | Image             | Image/picture             |
| info                | Info              | Information               |
| lifesaver           | LifeBuoy          | Lifesaver/help            |
| lightbulb           | Lightbulb         | Lightbulb/idea            |
| mail                | Mail              | Mail/envelope             |
| map-pin             | MapPin            | Location/map pin          |
| maps                | Map               | Map                       |
| mobile              | Smartphone        | Mobile phone              |
| name                | User              | User/person               |
| notebook            | Notebook          | Notebook                  |
| notebook-pencil     | NotebookPen       | Notebook with pen         |
| page-blank          | File              | File/blank page           |
| phone               | Phone             | Phone call                |
| play                | Play              | Play button               |
| plus                | Plus              | Plus/add                  |
| profile             | User              | User profile              |
| profile-card        | Card              | Profile card              |
| reload              | RefreshCw         | Reload/refresh            |
| star                | Star              | Star/favorite             |
| star-filled         | Star              | Filled star               |
| search              | Search            | Search/magnifying glass   |
| sparkle             | Sparkles          | Sparkle/shine             |
| sparkle-double      | Zap               | Double sparkle/lightning  |
| square-code         | CodeSquare        | Code square               |
| square-image        | ImageSquare       | Image square              |
| square-text         | TextSquare        | Text square               |
| suitcase            | Briefcase         | Suitcase/business         |
| settings-slider     | Sliders           | Settings/sliders          |
| user                | User              | User/person               |
| wreath              | Wreath            | Wreath                    |
| write               | Pen               | Pen/write                 |
| write-alt           | Edit              | Edit                      |
| write-alt2          | Pencil            | Pencil                    |

## Usage

### In Button Component

```tsx
import { Button } from '@/components/widgets';

// Icon-only button
<Button iconStart="plus" uniform pill size="lg" />

// Button with label and icon
<Button label="Search" iconStart="search" />

// Button with trailing icon
<Button label="Download" iconEnd="external-link" />
```

### Accessing the Mapping

```tsx
import { buttonIconMap, getLucideIconName } from '@/components/widgets/iconMapping';

// Get the lucide icon name
const lucideName = getLucideIconName('plus'); // Returns 'Plus'

// Access the entire mapping
const allMappings = buttonIconMap;
```

## Icon Sizes

Icons are automatically sized based on the button's `iconSize` prop:

| Icon Size        | Tailwind Classes |
| ---------------- | ---------------- |
| 3xs, 2xs, xs, sm | w-4 h-4          |
| md, lg           | w-5 h-5          |
| xl, 2xl, 3xl     | w-6 h-6          |

## Adding New Icons

1. Add the icon name to `ButtonIcon` type in `types/widget.ts`
2. Add the mapping entry in `buttonIconMap` in `iconMapping.ts`
3. Ensure the lucide-react icon exists

```typescript
// types/widget.ts
export type ButtonIcon = 'plus' | 'minus' | 'new-icon'; // Add here

// iconMapping.ts
export const buttonIconMap: Record<ButtonIcon, string> = {
  plus: 'Plus',
  minus: 'Minus',
  'new-icon': 'LucideIconName', // Add mapping
};
```

## See Also

- [Lucide React Icons](https://lucide.dev/) - Full icon library documentation
- `Button.tsx` - Button component implementation
- `types/widget.ts` - Widget type definitions
