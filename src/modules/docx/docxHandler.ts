import * as vscode from 'vscode';
import * as mammoth from 'mammoth';
import * as path from 'path';
import * as fs from 'fs';
import { Document, Packer, Paragraph, TextRun } from 'docx';

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
     * @param originalDocxPath 原始docx文件路径
     * @returns 临时文件路径
     */
    public async createTempFile(content: string, originalDocxPath: string): Promise<string> {
        const tempDir = path.join(vscode.workspace.rootPath || '', '.vscode', 'temp');
        const originalFileName = path.basename(originalDocxPath, '.docx');
        const tempFile = path.join(tempDir, `${originalFileName}_temp.txt`);
        
        // 确保临时目录存在
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
        
        // 写入内容
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(tempFile),
            Buffer.from(content, 'utf8')
        );
        
        return tempFile;
    }

    /**
     * 导出为新的docx文件
     * @param content 文本内容
     * @param originalDocxPath 原始docx文件路径
     * @returns 新docx文件路径
     */
    public async exportToDocx(content: string, originalDocxPath: string): Promise<string> {
        try {
            const originalFileName = path.basename(originalDocxPath, '.docx');
            const dir = path.dirname(originalDocxPath);
            const newDocxPath = path.join(dir, `${originalFileName}_已修正.docx`);
            
            // 创建新的Word文档
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: content.split('\n').map(line => 
                        new Paragraph({
                            children: [
                                new TextRun(line)
                            ]
                        })
                    )
                }]
            });

            // 保存文档
            const buffer = await Packer.toBuffer(doc);
            await fs.promises.writeFile(newDocxPath, buffer);
            
            return newDocxPath;
        } catch (error: any) {
            throw new Error(`导出Word文档失败: ${error.message}`);
        }
    }
} 