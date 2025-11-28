export type Variant = 'sharp' | 'rounded' | 'outlined';

export type MaterialSymbolsPluginArgs = {
    variant: Variant;
    paths: string[];
    safelist?: string[];
    files?: string[];
    iconProps?: string[];
    opsz?: string;
    wght?: string;
    FILL?: string;
    GRAD?: string;
};
