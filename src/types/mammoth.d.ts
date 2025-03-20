declare module 'mammoth' {
    export interface MammothOptions {
        path?: string;
        buffer?: Buffer;
        arrayBuffer?: ArrayBuffer;
    }

    export interface MammothResult {
        value: string;
        messages: any[];
    }

    export function extractRawText(options: MammothOptions): Promise<MammothResult>;
    export function convertToHtml(options: MammothOptions): Promise<MammothResult>;
} 