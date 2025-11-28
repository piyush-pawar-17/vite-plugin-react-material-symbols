import fs from 'node:fs/promises';
import path from 'node:path';

import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';

import type TraverseType from '@babel/traverse';
import type {
    ArgumentPlaceholder,
    Expression,
    JSXAttribute,
    JSXElement,
    JSXEmptyExpression,
    JSXExpressionContainer,
    JSXFragment,
    JSXSpreadAttribute,
    JSXSpreadChild,
    JSXText,
    SpreadElement,
    StringLiteral,
} from '@babel/types';
import type { Variant } from './types';

const variantToFontMap: Record<Variant, string> = {
    sharp: 'Material+Symbols+Sharp',
    rounded: 'Material+Symbols+Rounded',
    outlined: 'Material+Symbols+Outlined',
};

const variantToClassNameMap: Record<Variant, string> = {
    sharp: 'material-symbols-sharp',
    rounded: 'material-symbols-rounded',
    outlined: 'material-symbols-outlined',
};

const traverse: typeof TraverseType = (_traverse as unknown as { default: typeof TraverseType }).default || _traverse;

/**
 * Helper function to extract icon names from conditional expressions.
 * Recursively traverses expression trees to find all string literal icon names.
 *
 * @param expression - Babel AST expression node
 * @param icons - Set to collect discovered icon names
 */
function extractIconsFromExpression(
    expression: Expression | JSXEmptyExpression | SpreadElement | ArgumentPlaceholder,
    icons: Set<string>
) {
    if (!expression) return;

    /* Handle string literals */
    if (expression.type === 'StringLiteral') {
        const iconName = expression.value.trim();
        if (iconName) icons.add(iconName);
        return;
    }

    /* Handle conditional expressions (ternary) */
    if (expression.type === 'ConditionalExpression') {
        extractIconsFromExpression(expression.consequent, icons);
        extractIconsFromExpression(expression.alternate, icons);
        return;
    }

    /* Handle logical expressions (&& and ||) */
    if (expression.type === 'LogicalExpression') {
        extractIconsFromExpression(expression.left, icons);
        extractIconsFromExpression(expression.right, icons);
        return;
    }

    /* Handle template literals */
    if (expression.type === 'TemplateLiteral' && expression.quasis.length === 1) {
        const iconName = expression.quasis[0].value.cooked?.trim();
        if (iconName) icons.add(iconName);
        return;
    }

    /* Handle call expressions (clsx, twMerge, etc.) */
    if (expression.type === 'CallExpression') {
        expression.arguments.forEach((arg) => {
            extractIconsFromExpression(arg, icons);
        });
        return;
    }
}

/**
 * Checks if a className attribute or expression contains the specified font family class.
 * Recursively traverses expressions to find string literals containing the target class.
 *
 * @param classValue - Babel AST node representing the className value
 * @param fontFamily - The font family class name to look for
 * @returns true if the specified font family class is found, false otherwise
 */
function hasMaterialSymbolsClass(
    classValue:
        | JSXElement
        | JSXFragment
        | JSXExpressionContainer
        | StringLiteral
        | Expression
        | JSXEmptyExpression
        | SpreadElement
        | ArgumentPlaceholder
        | null
        | undefined,
    fontFamily: string
): boolean {
    if (!classValue) return false;

    /* Handle string literals */
    if (classValue.type === 'StringLiteral') {
        return classValue.value.includes(fontFamily);
    }

    /* Handle JSX expression containers */
    if (classValue.type === 'JSXExpressionContainer') {
        return hasMaterialSymbolsClass(classValue.expression, fontFamily);
    }

    /* Handle call expressions (clsx, twMerge, etc.) */
    if (classValue.type === 'CallExpression') {
        return classValue.arguments.some((arg) => hasMaterialSymbolsClass(arg, fontFamily));
    }

    /* Handle conditional expressions (ternary) */
    if (classValue.type === 'ConditionalExpression') {
        return (
            hasMaterialSymbolsClass(classValue.consequent, fontFamily) ||
            hasMaterialSymbolsClass(classValue.alternate, fontFamily)
        );
    }

    /* Handle logical expressions (&& and ||) */
    if (classValue.type === 'LogicalExpression') {
        return (
            hasMaterialSymbolsClass(classValue.left, fontFamily) ||
            hasMaterialSymbolsClass(classValue.right, fontFamily)
        );
    }

    /* Handle template literals */
    if (classValue.type === 'TemplateLiteral') {
        return classValue.quasis.some((quasi) => quasi.value.cooked?.includes(fontFamily));
    }

    return false;
}

/**
 * Extracts icon names from JSX element children.
 * Handles JSXText nodes and JSXExpressionContainer nodes with expressions.
 *
 * @param children - Array of JSX child nodes
 * @param icons - Set to collect discovered icon names
 */
function extractIconsFromChildren(
    children: (JSXElement | JSXFragment | JSXExpressionContainer | JSXSpreadChild | JSXText)[],
    icons: Set<string>
) {
    children.forEach((child) => {
        if (child.type === 'JSXText') {
            const iconName = child.value.trim();
            if (iconName) icons.add(iconName);
        } else if (child.type === 'JSXExpressionContainer') {
            extractIconsFromExpression(child.expression, icons);
        }
    });
}

/**
 * Extracts icon names from a specific attribute on a JSX element.
 * Handles both string literals and JSX expression containers.
 *
 * @param attributes - Array of JSX attributes from the element
 * @param attributeName - Name of the attribute to extract icons from
 * @param icons - Set to collect discovered icon names
 */
function extractIconsFromAttribute(
    attributes: (JSXAttribute | JSXSpreadAttribute)[],
    attributeName: string,
    icons: Set<string>
) {
    const attribute = attributes.find((attr) => attr.type === 'JSXAttribute' && attr.name?.name === attributeName);

    if (attribute?.type === 'JSXAttribute' && attribute.value) {
        if (attribute.value.type === 'StringLiteral') {
            const iconName = attribute.value.value.trim();
            if (iconName) icons.add(iconName);
        } else if (attribute.value.type === 'JSXExpressionContainer') {
            extractIconsFromExpression(attribute.value.expression, icons);
        }
    }
}

/**
 * Recursively scans a directory and returns the contents of all TSX, JSX, and JS files.
 *
 * @param directory - The root directory path to start scanning from
 * @returns A promise that resolves to an array of objects containing file paths and their contents
 *
 * @example
 * ```ts
 * const files = await getReactFileContents('/path/to/src');
 * // [{ path: '/path/to/src/App.tsx', content: '...' }, ...]
 * ```
 */
export async function getReactFileContents(directory: string) {
    const allFileContents: { path: string; content: string }[] = [];
    const supportedExtensions = ['.tsx', '.jsx', '.js'];

    async function walk(currentDir: string) {
        const files = await fs.readdir(currentDir, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(currentDir, file.name);

            if (file.isDirectory()) {
                await walk(fullPath);
            } else if (file.isFile() && supportedExtensions.some((ext) => file.name.endsWith(ext))) {
                const content = await fs.readFile(fullPath, 'utf8');
                allFileContents.push({
                    path: fullPath,
                    content: content,
                });
            }
        }
    }

    await walk(directory);
    return allFileContents;
}

/**
 * Processes a single React file (TSX, JSX, or JS) to extract Material Symbols icon names.
 *
 * @param file - Object containing the file path and content
 * @param icons - Set to store discovered icon names
 * @param variant - The Material Symbols variant to look for
 * @param iconProps - Array of prop names to scan for icon names
 * @returns Promise that resolves when the file has been processed
 *
 * @example
 * ```ts
 * const icons = new Set<string>();
 * await processReactFile({ path: 'App.tsx', content: '...' }, icons, 'rounded', ['icon', 'leftIcon', 'rightIcon']);
 * ```
 */
export async function processReactFile(
    file: { path: string; content: string },
    icons: Set<string>,
    variant: Variant,
    iconProps: string[] = []
): Promise<void> {
    try {
        const ast = parser.parse(file.content, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
        });

        traverse(ast, {
            JSXElement(path) {
                const classNameAttribute = path.node.openingElement.attributes.find(
                    (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'className'
                );

                if (classNameAttribute?.type === 'JSXAttribute') {
                    /* Handle className attribute with material-symbols-* classes */
                    if (hasMaterialSymbolsClass(classNameAttribute.value, variantToClassNameMap[variant])) {
                        extractIconsFromChildren(path.node.children, icons);
                    }
                }

                const attributes = path.node.openingElement.attributes;

                /* Handle components with icon props as they are used for icons */
                for (const prop of iconProps) {
                    extractIconsFromAttribute(attributes, prop, icons);
                }
            },
        });
    } catch (error) {
        console.warn(`Failed to parse ${file.path}:`, error instanceof Error ? error.message : String(error));
    }
}

/**
 * Creates a Google Fonts stylesheet link element for Material Symbols.
 *
 * @param document - The document object to create the link element in
 * @param variant - The Material Symbols variant to use
 * @param opsz - Optical size range for the font
 * @param wght - Font weight range for the font
 * @param FILL - Fill range for the font
 * @param GRAD - Grade range for the font
 * @param icons - Array of icon names to include in the font
 * @returns HTMLLinkElement configured with the Material Symbols font
 *
 * @example
 * ```ts
 * const link = createMaterialSymbolsLink(document, 'rounded', '20..48', '100..700', '0..1', '-50..200', ['home', 'settings']);
 * document.head.appendChild(link);
 * ```
 */
export function createMaterialSymbolsLink(
    document: Document,
    variant: Variant,
    opsz: string,
    wght: string,
    FILL: string,
    GRAD: string,
    icons: string[]
): HTMLLinkElement {
    const iconsLink = document.createElement('link');
    iconsLink.rel = 'stylesheet';
    iconsLink.href = `https://fonts.googleapis.com/css2?family=${variantToFontMap[variant]}:opsz,wght,FILL,GRAD@${opsz},${wght},${FILL},${GRAD}&icon_names=${icons.join(',')}&display=block`;
    return iconsLink;
}
