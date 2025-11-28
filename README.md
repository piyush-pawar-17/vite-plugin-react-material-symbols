# Vite Plugin React Material Symbols

A Vite plugin that automatically discovers Material Symbols Icons usage in React files and injects an optimized Google Fonts stylesheet with only the icons used in your application.

## Features

- 🚀 **Automatic Discovery**: Scans React files (TSX, JSX, JS) for Material Symbols usage
- 📦 **Optimized Loading**: Generates Google Fonts URLs with only the icons you actually use
- 🎯 **Smart Detection**: Supports various usage patterns including conditional rendering and utility functions
- ⚙️ **Flexible Configuration**: Customize font variants, optical sizes, weights, and more
- 🛡️ **Safelist Support**: Include icons that might be rendered dynamically

## Usage

### Basic Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vitePluginReactMaterialSymbols from 'vite-plugin-react-material-symbols';

export default defineConfig({
    plugins: [
        vitePluginReactMaterialSymbols({
            variant: 'rounded', // Required: 'sharp' | 'rounded' | 'outlined'
            paths: ['src'], // Required: Directories to scan
        }),
    ],
});
```

### Advanced Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vitePluginReactMaterialSymbols from 'vite-plugin-react-material-symbols';

export default defineConfig({
    plugins: [
        vitePluginReactMaterialSymbols({
            variant: 'rounded',
            paths: ['src', 'components'],
            files: ['src/icons.tsx', 'lib/components.jsx'], // Optional: Specific files to process
            safelist: ['home', 'settings'], // Optional: Always include these icons
            iconProps: ['prefix', 'postfix', 'icon', 'prefixIcon', 'suffixIcon', 'leftIcon', 'rightIcon'], // Optional: Props to scan for icons
            opsz: '24..48', // Optional: Optical size range (default: "20..48")
            wght: '300..600', // Optional: Font weight range (default: "100..700")
            FILL: '0..1', // Optional: Fill range (default: "0..1")
            GRAD: '0..100', // Optional: Grade range (default: "-50..200")
        }),
    ],
});
```

## Configuration Options

### Required Parameters

| Parameter | Type                                 | Description                         |
| --------- | ------------------------------------ | ----------------------------------- |
| `variant` | `'sharp' \| 'rounded' \| 'outlined'` | Material Symbols variant to use     |
| `paths`   | `string[]`                           | Directories to scan for React files |

### Optional Parameters

| Parameter   | Type       | Default      | Description                                        |
| ----------- | ---------- | ------------ | -------------------------------------------------- |
| `files`     | `string[]` | `[]`         | Specific files to process                          |
| `safelist`  | `string[]` | `[]`         | Icons to always include (useful for dynamic icons) |
| `iconProps` | `string[]` | `[]`         | Props to scan for icon names                       |
| `opsz`      | `string`   | `"20..48"`   | Optical size range                                 |
| `wght`      | `string`   | `"100..700"` | Font weight range                                  |
| `FILL`      | `string`   | `"0..1"`     | Fill range                                         |
| `GRAD`      | `string`   | `"-50..200"` | Grade range                                        |

## Supported Usage Patterns

The plugin detects Material Symbols usage in various patterns:

### 1. Direct Class Names

```tsx
<span className="material-symbols-rounded">home</span>
<span className="material-symbols-outlined">settings</span>
<span className="material-symbols-sharp">search</span>
```

### 2. Conditional Rendering

```tsx
<span className="material-symbols-rounded">{isLoggedIn ? 'logout' : 'login'}</span>
```

### 3. Utility Functions

```tsx
import clsx from 'clsx';

<span className={clsx('material-symbols-rounded', isActive && 'active')}>{iconName}</span>;
```

### 4. Component Props

The plugin also detects icons passed through component props. You can customize which props to scan using the `iconProps` configuration:

```ts
// vite.config.ts
vitePluginReactMaterialSymbols({
    variant: 'rounded',
    paths: ['src'],
    iconProps: ['leftIcon', 'rightIcon', 'startIcon', 'endIcon'], // Custom props
});
```

Then the plugin will detect:

```tsx
<IconComponent leftIcon="home" />
<IconComponent rightIcon={<span className="material-symbols-rounded">settings</span>} />
```

## Use Cases

### Use Case 1: Simple React App

For a basic React application using Material Symbols:

```ts
// vite.config.ts
export default defineConfig({
    plugins: [
        vitePluginReactMaterialSymbols({
            variant: 'rounded',
            paths: ['src'],
        }),
    ],
});
```

### Use Case 2: Component Library

When building a component library with icons in multiple directories:

```ts
// vite.config.ts
export default defineConfig({
    plugins: [
        vitePluginReactMaterialSymbols({
            variant: 'outlined',
            paths: ['src/components', 'src/icons'],
            safelist: ['chevron_left', 'chevron_right'], // Common navigation icons
            iconProps: ['leftIcon', 'rightIcon', 'startIcon', 'endIcon'], // Custom component props
            opsz: '20..24',
            wght: '400..500',
        }),
    ],
});
```

### Use Case 3: Dynamic Icons

For applications that render icons dynamically:

```ts
// vite.config.ts
export default defineConfig({
    plugins: [
        vitePluginReactMaterialSymbols({
            variant: 'sharp',
            paths: ['src'],
            files: ['src/dynamic-icons.tsx'], // Process specific file with dynamic icons
            safelist: ['menu', 'close', 'arrow_back', 'arrow_forward'], // Ensure dynamic icons are included
            FILL: '1', // Always filled
        }),
    ],
});
```

### Use Case 4: Multi-variant Usage

If you use different Material Symbols variants in different parts of your app:

```ts
// vite.config.ts
export default defineConfig({
    plugins: [
        // Configure for rounded icons in main app
        vitePluginReactMaterialSymbols({
            variant: 'rounded',
            paths: ['src/components'],
            safelist: ['home', 'dashboard'],
        }),
        // Configure for sharp icons in admin panel
        vitePluginReactMaterialSymbols({
            variant: 'sharp',
            paths: ['src/admin'],
            safelist: ['admin', 'settings'],
        }),
    ],
});
```

## How It Works

1. **Scanning**: During build, the plugin scans specified directories and files for React components
2. **Parsing**: It parses JSX/TSX files to find elements with Material Symbols class names
3. **Extraction**: Icon names are extracted from element text content and common props
4. **Generation**: An optimized Google Fonts URL is generated with only the discovered icons
5. **Injection**: The stylesheet link is injected into the HTML head

## Example Output

The plugin generates a Google Fonts URL like:

```html
<link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=home,settings,search,menu&display=block"
/>
```

This ensures only the icons you actually use are loaded, improving performance.
