# langcrew Documentation

This directory contains the documentation website for langcrew, built with Astro and Starlight.

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd docs
npm install
```

### Development

```bash
npm run dev
# Open http://localhost:4321
```

### Build

```bash
npm run build
# Output in ./dist directory
```

## Project Structure

```
docs/
├── src/
│   ├── content/
│   │   └── docs/         # All documentation content
│   ├── assets/           # Images, logos, etc.
│   └── components/       # Custom MDX components
├── public/               # Static files
└── astro.config.mjs      # Astro configuration
```

## Writing Documentation

### Creating New Pages

1. Add `.mdx` files to `src/content/docs/`
2. Use frontmatter for metadata:

   ```mdx
   ---
   title: Your Page Title
   description: Brief description
   ---
   ```

### Adding to Navigation

Edit sidebar in `astro.config.mjs`:

```js
sidebar: [
  {
    label: 'Section Name',
    items: [
      { label: 'Page Name', link: '/path/to/page' },
    ],
  },
]
```

### Using Components

Import and use MDX components:

```mdx
import { Card } from '../../components/Card.astro';

<Card title="Example">
  Content here
</Card>
```

## Commands

All commands are run from the root of the docs directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Deployment

### GitHub Pages

1. Push to main branch
2. GitHub Actions automatically builds and deploys
3. Access at: https://[username].github.io/langcrew

### Manual Deploy

```bash
npm run build
# Deploy ./dist to any static host
```

## Contributing

### Style Guide

- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts
- Keep consistent formatting

### Review Process

1. Create feature branch
2. Make changes
3. Preview locally
4. Submit PR for review

## Resources

- [Starlight Documentation](https://starlight.astro.build/)
- [Astro Documentation](https://docs.astro.build)
- [langcrew Repository](https://github.com/yourusername/langcrew)
