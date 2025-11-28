import fs from 'node:fs/promises';
import path from 'node:path';

import { parseHTML } from 'linkedom';

import { createMaterialSymbolsLink, getReactFileContents, processReactFile } from './utils';

import type { Plugin } from 'vite';
import type { MaterialSymbolsPluginArgs } from './types';

/**
 * Vite plugin that automatically discovers Material Symbols icon usage in React files (TSX, JSX, JS)
 * and injects a Google Fonts stylesheet link with only the icons used in the application.
 *
 * The plugin scans .tsx, .jsx, and .js files in specified directories and/or specific files during the build process,
 * parses JSX elements to find elements with the material-symbols-rounded class,
 * extracts icon names from their text content, and generates an optimized font stylesheet
 * URL containing only the discovered icons.
 *
 * @param options - Configuration options for the plugin
 * @param options.fontFamily - The font family class name to look for in JSX elements (required)
 * @param options.safelist - Array of icon names to always include in the generated stylesheet,
 * even if they are not detected in the code (useful for dynamically-rendered icons)
 * @param options.paths - Array of directory paths to scan for React files (.tsx, .jsx, .js) (defaults to ['src'])
 * @param options.files - Array of specific file paths to process (optional)
 * @param options.iconProps - Array of prop names to scan for icon names (defaults to ['prefix', 'postfix', 'icon', 'prefixIcon', 'suffixIcon'])
 * @param options.opsz - Optical size range for the font (defaults to "20..48")
 * @param options.wght - Font weight range for the font (defaults to "100..700")
 * @param options.FILL - Fill range for the font (0..1, defaults to "0..1")
 * @param options.GRAD - Grade range for the font (-50..200, defaults to "-50..200")
 * @returns A Vite plugin that transforms the HTML output to include the Material Symbols stylesheet
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import vitePluginReactMaterialSymbols from 'vite-plugin-react-material-symbols';
 *
 * export default defineConfig({
 *   plugins: [
 *     vitePluginReactMaterialSymbols({
 *       fontFamily: 'material-symbols-rounded',
 *       safelist: ['home', 'settings'],
 *       paths: ['src', 'components'],
 *       files: ['src/icons.tsx', 'lib/components.jsx'],
 *       iconProps: ['prefix', 'postfix', 'icon', 'prefixIcon', 'suffixIcon', 'leftIcon', 'rightIcon'],
 *       opsz: "24..48",
 *       wght: "300..600",
 *       FILL: "0..1",
 *       GRAD: "0..100"
 *     })
 *   ]
 * });
 * ```
 */
export default function vitePluginReactMaterialSymbols({
    variant,
    paths,
    safelist = [],
    files = [],
    iconProps = [],
    opsz = '20..48',
    wght = '100..700',
    FILL = '0..1',
    GRAD = '-50..200',
}: MaterialSymbolsPluginArgs): Plugin {
    const icons = new Set<string>(safelist);

    return {
        name: 'vite-plugin-react-material-symbols',
        enforce: 'pre' as const,
        transformIndexHtml: {
            order: 'pre' as const,
            async handler(html: string) {
                /* Process directories */
                for (const scanPath of paths) {
                    const fileContents = await getReactFileContents(path.resolve(process.cwd(), scanPath));

                    for (const file of fileContents) {
                        await processReactFile(file, icons, variant, iconProps);
                    }
                }

                /* Process specific files */
                for (const filePath of files) {
                    try {
                        const absolutePath = path.resolve(process.cwd(), filePath);
                        const content = await fs.readFile(absolutePath, 'utf-8');
                        await processReactFile({ path: filePath, content }, icons, variant, iconProps);
                    } catch (error) {
                        console.warn(
                            `Failed to read file ${filePath}:`,
                            error instanceof Error ? error.message : String(error)
                        );
                    }
                }

                const { document } = parseHTML(html);

                const allIcons = [...icons].filter((icon) => icon !== '').sort();

                const iconsLink = createMaterialSymbolsLink(document, variant, opsz, wght, FILL, GRAD, allIcons);

                /* Prepend the link at the top of the head to avoid cascading issues */
                document.head.prepend(iconsLink);

                return document.toString();
            },
        },
    } as Plugin;
}
