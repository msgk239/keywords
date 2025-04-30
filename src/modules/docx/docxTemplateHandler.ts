import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as JSZip from 'jszip';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

/**
 * Word文档模板处理器
 * 用于保留格式的Word文档导出
 */
export class DocxTemplateHandler {
    /**
     * 将文本内容应用到Word模板并保留格式
     * @param text 修改后的文本内容
     * @param originalDocxPath 原始Word文档路径
     * @returns 导出的Word文档路径
     */
    public async exportToDocxWithFormat(text: string, originalDocxPath: string): Promise<string> {
        try {
            // 创建输出文件路径
            const fileInfo = path.parse(originalDocxPath);
            const outputPath = path.join(fileInfo.dir, `${fileInfo.name}_修正后${fileInfo.ext}`);
            
            // 读取原始文档作为模板
            const content = fs.readFileSync(originalDocxPath, 'binary');
            const zip = new PizZip(content);
            
            // 创建docxtemplater实例
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });
            
            // 将文本切分为段落
            const paragraphs = text.split('\n');
            
            // 准备文档数据
            const data = {
                paragraphs: paragraphs,
                content: text,
            };
            
            // 渲染文档
            doc.render(data);
            
            // 生成输出文档
            const buffer = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });
            
            // 写入文件
            fs.writeFileSync(outputPath, buffer);
            
            return outputPath;
        } catch (error: any) {
            console.error('导出Word文档时发生错误:', error);
            throw new Error(`导出Word文档失败: ${error.message}`);
        }
    }
    
    /**
     * 处理复杂文档：通过段落比对替换
     * @param text 修改后的文本内容
     * @param originalDocxPath 原始Word文档路径
     * @returns 导出的Word文档路径
     */
    public async exportWithParagraphMatching(text: string, originalDocxPath: string): Promise<string> {
        try {
            // 创建输出文件路径
            const fileInfo = path.parse(originalDocxPath);
            const outputPath = path.join(fileInfo.dir, `${fileInfo.name}_修正后${fileInfo.ext}`);
            
            // 读取原始文档
            const content = fs.readFileSync(originalDocxPath);
            
            // 使用临时目录解压文档
            const tempDir = path.join(process.env.TEMP || '', 'docx-temp', Date.now().toString());
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // 解压文档
            const zip = new JSZip();
            await zip.loadAsync(content);
            
            // 提取document.xml
            const documentXml = await zip.file('word/document.xml')?.async('string');
            if (!documentXml) {
                throw new Error('无法读取文档内容');
            }
            
            // 替换文本内容但保留格式
            const newDocumentXml = this.replaceDocumentContent(documentXml, text);
            
            // 更新document.xml
            zip.file('word/document.xml', newDocumentXml);
            
            // 生成新的文档
            const newContent = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });
            
            // 写入文件
            fs.writeFileSync(outputPath, newContent);
            
            return outputPath;
        } catch (error: any) {
            console.error('导出Word文档时发生错误:', error);
            throw new Error(`导出Word文档失败: ${error.message}`);
        }
    }
    
    /**
     * 替换文档内容但保留格式
     * @param documentXml Word文档的XML内容
     * @param newText 新的文本内容
     * @returns 更新后的XML内容
     */
    private replaceDocumentContent(documentXml: string, newText: string): string {
        // 将新文本分割为段落
        const paragraphs = newText.split('\n');
        
        // 使用简单的正则表达式替换文本内容但保留标签
        let updatedXml = documentXml;
        
        // 匹配文本内容
        const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
        const textMatches = [...documentXml.matchAll(textRegex)];
        
        // 收集所有文本段落
        let currentParagraphIndex = 0;
        
        // 这里使用一个简化的替换方法
        // 实际应用中可能需要更复杂的XML处理
        for (const paragraph of paragraphs) {
            if (currentParagraphIndex < textMatches.length) {
                // 替换当前段落的文本
                const match = textMatches[currentParagraphIndex];
                updatedXml = updatedXml.replace(match[0], `<w:t>${paragraph}</w:t>`);
                currentParagraphIndex++;
            }
        }
        
        return updatedXml;
    }
} 