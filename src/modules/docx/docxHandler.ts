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
            // 使用HTML转换可以保留更多格式信息
            const result = await mammoth.convertToHtml({ path: filePath });
            let html = result.value;
            
            // 处理HTML，转换为格式化的纯文本
            // 将<p>标签替换为段落（双换行）
            html = html.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n');
            
            // 将<br>标签替换为单个换行
            html = html.replace(/<br\s*\/?>/g, '\n');
            
            // 移除所有其他HTML标签
            html = html.replace(/<[^>]*>/g, '');
            
            // 解码HTML实体
            html = html.replace(/&nbsp;/g, ' ')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"');
            
            // 移除多余的空行（超过2个换行符的情况）
            html = html.replace(/\n{3,}/g, '\n\n');
            
            // 确保文本以新行结束
            if (!html.endsWith('\n')) {
                html += '\n';
            }
            
            return html;
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
            
            // 处理段落
            const paragraphs = content.split('\n\n').map(paragraph => {
                // 处理段落内的换行
                const lines = paragraph.split('\n').filter(line => line.trim());
                return new Paragraph({
                    children: lines.map(line => 
                        new TextRun({
                            text: line,
                            size: 24, // 12pt
                            font: '宋体'
                        })
                    ),
                    spacing: {
                        after: 200, // 段落间距
                        line: 360 // 行间距
                    }
                });
            });

            // 创建新的Word文档
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: paragraphs
                }],
                styles: {
                    default: {
                        document: {
                            run: {
                                font: '宋体',
                                size: 24
                            },
                            paragraph: {
                                spacing: {
                                    after: 200,
                                    line: 360
                                }
                            }
                        }
                    }
                }
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