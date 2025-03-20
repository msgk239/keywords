import * as vscode from 'vscode';
import * as mammoth from 'mammoth';
import * as path from 'path';

export class DocxHandler {
    /**
     * 将 DOCX 文件转换为纯文本
     * @param filePath DOCX 文件路径
     * @returns 转换后的文本内容
     */
    public async convertDocxToText(filePath: string): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (error: any) {
            throw new Error(`无法转换 DOCX 文件: ${error.message}`);
        }
    }

    /**
     * 检查文件是否为 DOCX 格式
     * @param filePath 文件路径
     * @returns 是否为 DOCX 文件
     */
    public isDocxFile(filePath: string): boolean {
        return path.extname(filePath).toLowerCase() === '.docx';
    }

    /**
     * 创建临时文本文件
     * @param content 文本内容
     * @returns 临时文件路径
     */
    public async createTempFile(content: string): Promise<string> {
        const tempDir = path.join(vscode.workspace.rootPath || '', '.vscode', 'temp');
        const tempFile = path.join(tempDir, `temp_${Date.now()}.txt`);
        
        // 确保临时目录存在
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
        
        // 写入内容
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(tempFile),
            Buffer.from(content, 'utf8')
        );
        
        return tempFile;
    }
} 