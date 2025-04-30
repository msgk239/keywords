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
        const paragraphs = newText.split('\n').filter(p => p.trim());
        
        // 使用XML解析而不是简单的正则表达式
        // 找到文档中的所有段落元素
        const paragraphRegex = /<w:p\b[^>]*>.*?<\/w:p>/g;
        const docParagraphs = [...documentXml.matchAll(paragraphRegex)];
        
        let updatedXml = documentXml;
        
        // 只替换找到的段落数量和新文本段落数量中较小的一个
        const paragraphsToReplace = Math.min(paragraphs.length, docParagraphs.length);
        
        for (let i = 0; i < paragraphsToReplace; i++) {
            const docParagraph = docParagraphs[i][0];
            const newParagraphText = paragraphs[i];
            
            // 保留段落的所有格式标签，只替换文本内容
            let updatedParagraph = docParagraph;
            const textRunRegex = /<w:r\b[^>]*>.*?<\/w:r>/g;
            const textRuns = [...docParagraph.matchAll(textRunRegex)];
            
            if (textRuns.length > 0) {
                // 只替换第一个文本运行的内容
                const firstRun = textRuns[0][0];
                const updatedRun = firstRun.replace(
                    /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g,
                    (match, text) => match.replace(text, newParagraphText)
                );
                updatedParagraph = docParagraph.replace(firstRun, updatedRun);
                updatedXml = updatedXml.replace(docParagraph, updatedParagraph);
            }
        }
        
        return updatedXml;
    }

    /**
     * 使用原文档作为模板导出新Word文档
     * @param text 修改后的文本内容
     * @param originalDocxPath 原始Word文档路径
     * @returns 导出的Word文档路径
     */
    public async exportAsTemplate(text: string, originalDocxPath: string): Promise<string> {
        try {
            // 创建输出文件路径
            const fileInfo = path.parse(originalDocxPath);
            const outputPath = path.join(fileInfo.dir, `${fileInfo.name}_修正后${fileInfo.ext}`);
            
            // 获取原文件内容
            const template = fs.readFileSync(originalDocxPath, 'binary');
            const zip = new PizZip(template);
            
            // 创建文档实例
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });
            
            // 提取段落
            const paragraphs = text.split('\n').filter(p => p.trim());
            
            // 准备替换数据
            // 方式1: 使用单一内容变量
            const data = { content: text };
            
            // 方式2: 使用索引段落 - 更可控但需要模板中有对应标记
            const paragraphData: Record<string, string> = {};
            paragraphs.forEach((p, index) => {
                paragraphData[`paragraph${index + 1}`] = p;
            });
            
            // 合并数据
            const templateData = {
                ...data,
                ...paragraphData,
                paragraphs: paragraphs // 支持循环渲染
            };
            
            // 渲染模板
            doc.render(templateData);
            
            // 生成输出
            const buffer = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });
            
            // 写入文件
            fs.writeFileSync(outputPath, buffer);
            
            return outputPath;
        } catch (error: any) {
            console.error('导出模板Word文档时发生错误:', error);
            throw new Error(`导出模板Word文档失败: ${error.message}`);
        }
    }

    /**
     * 直接复制原文档并替换内容，保持完全相同的格式
     * @param text 修改后的文本内容
     * @param originalDocxPath 原始Word文档路径
     * @returns 导出的Word文档路径
     */
    public async copyAndReplaceContent(text: string, originalDocxPath: string): Promise<string> {
        try {
            // 创建输出文件路径
            const fileInfo = path.parse(originalDocxPath);
            const outputPath = path.join(fileInfo.dir, `${fileInfo.name}_修正后${fileInfo.ext}`);
            
            // 读取原始文档
            const content = fs.readFileSync(originalDocxPath);
            
            // 解压文档
            const zip = new JSZip();
            await zip.loadAsync(content);
            
            // 提取document.xml
            const documentXml = await zip.file('word/document.xml')?.async('string');
            if (!documentXml) {
                throw new Error('无法读取文档内容');
            }
            
            // 分析文档结构，提取所有文本部分
            // 使用正则表达式（兼容es2015）
            const textTags = [];
            let textMatch;
            const textRegex = /<w:t(?:\s+[^>]*)?>(.*?)<\/w:t>/g;
            
            while ((textMatch = textRegex.exec(documentXml)) !== null) {
                textTags.push({
                    fullTag: textMatch[0],
                    content: textMatch[1],
                    index: textMatch.index
                });
            }
            
            // 将新文本拆分成适合替换的片段
            const textParts = this.splitTextToMatchDocumentStructure(text, textTags.length);
            
            // 创建新的document.xml，保留所有格式标签，只替换文本内容
            let newDocumentXml = documentXml;
            
            for (let i = 0; i < Math.min(textTags.length, textParts.length); i++) {
                const tag = textTags[i];
                const newText = textParts[i];
                
                // 替换标签内容但保留标签本身
                const newTag = tag.fullTag.replace(tag.content, newText);
                // 从后向前替换，避免索引变化问题
                newDocumentXml = newDocumentXml.substring(0, tag.index) + 
                                newTag + 
                                newDocumentXml.substring(tag.index + tag.fullTag.length);
            }
            
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
            console.error('替换Word文档内容时发生错误:', error);
            throw new Error(`替换Word文档内容失败: ${error.message}`);
        }
    }

    /**
     * 将文本分割为匹配文档结构的片段
     * @param text 完整文本
     * @param targetCount 目标片段数量
     * @returns 分割后的文本片段
     */
    private splitTextToMatchDocumentStructure(text: string, targetCount: number): string[] {
        // 首先按段落分割
        const paragraphs = text.split('\n').filter(p => p.trim());
        
        if (paragraphs.length >= targetCount) {
            // 如果段落数量足够，直接取前targetCount个
            return paragraphs.slice(0, targetCount);
        }
        
        // 如果段落不够，需要将段落进一步分割
        const result: string[] = [];
        
        // 计算每个段落应该分割的片段数
        const avgPartsPerParagraph = Math.ceil(targetCount / paragraphs.length);
        
        for (const paragraph of paragraphs) {
            if (result.length >= targetCount) break;
            
            // 计算当前段落还需要分割的片段数
            const remainingNeeded = targetCount - result.length;
            const partsForThisParagraph = Math.min(avgPartsPerParagraph, remainingNeeded);
            
            if (partsForThisParagraph === 1) {
                // 如果只需要一个片段，直接添加整个段落
                result.push(paragraph);
            } else {
                // 需要进一步分割段落
                const charsPerPart = Math.ceil(paragraph.length / partsForThisParagraph);
                
                for (let i = 0; i < partsForThisParagraph; i++) {
                    if (result.length >= targetCount) break;
                    
                    const start = i * charsPerPart;
                    const end = Math.min(start + charsPerPart, paragraph.length);
                    result.push(paragraph.substring(start, end));
                }
            }
        }
        
        // 如果还是不够，添加空字符串补齐
        while (result.length < targetCount) {
            result.push('');
        }
        
        return result;
    }

    /**
     * 使用原始文档作为参考，创建结构相同但内容已修改的新文档
     * @param newText 修改后的文本内容
     * @param originalDocxPath 原始Word文档路径
     * @returns 导出的Word文档路径
     */
    public async createMatchingDocument(newText: string, originalDocxPath: string): Promise<string> {
        try {
            // 创建输出文件路径
            const fileInfo = path.parse(originalDocxPath);
            const outputPath = path.join(fileInfo.dir, `${fileInfo.name}_修正后${fileInfo.ext}`);
            
            // 首先完整复制原始文档
            fs.copyFileSync(originalDocxPath, outputPath);
            
            // 解压原始文档以获取结构
            const content = fs.readFileSync(originalDocxPath);
            const zip = new JSZip();
            await zip.loadAsync(content);
            
            // 只修改document.xml文件（包含正文内容）
            const documentXml = await zip.file('word/document.xml')?.async('string');
            if (!documentXml) {
                throw new Error('无法读取文档内容');
            }

            // 找到所有段落和文本
            const paragraphMatches = [];
            const paragraphRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
            let paragraphMatch;
            
            while ((paragraphMatch = paragraphRegex.exec(documentXml)) !== null) {
                // 确保捕获组存在
                if (paragraphMatch[1] && paragraphMatch[1].includes('<w:t')) {
                    paragraphMatches.push({
                        fullTag: paragraphMatch[0],
                        content: paragraphMatch[1],
                        index: paragraphMatch.index
                    });
                }
            }
            
            // 分段修改后的文本
            const paragraphs = newText.split('\n').filter(p => p.trim());
            let newDocumentXml = documentXml;
            
            // 只修改包含文本的段落
            const maxParagraphs = Math.min(paragraphMatches.length, paragraphs.length);
            
            // 从后向前替换，避免索引变化问题
            for (let i = maxParagraphs - 1; i >= 0; i--) {
                const oldParagraph = paragraphMatches[i];
                const newContent = paragraphs[i];
                
                // 从段落中提取所有文本标签
                const textTags = [];
                const textRegex = /<w:t(?:\s+[^>]*)?>(.*?)<\/w:t>/g;
                let textMatch;
                let paragraphContent = oldParagraph.content;
                
                while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
                    textTags.push({
                        fullTag: textMatch[0],
                        content: textMatch[1]
                    });
                }
                
                // 如果段落有文本标签
                if (textTags.length > 0) {
                    // 修改第一个文本标签的内容，清空其他文本标签
                    let modifiedContent = paragraphContent;
                    
                    // 替换第一个文本标签
                    const firstTag = textTags[0];
                    const newTag = firstTag.fullTag.replace(firstTag.content, newContent);
                    modifiedContent = modifiedContent.replace(firstTag.fullTag, newTag);
                    
                    // 清空其他文本标签
                    for (let j = 1; j < textTags.length; j++) {
                        const tag = textTags[j];
                        modifiedContent = modifiedContent.replace(tag.fullTag, tag.fullTag.replace(tag.content, ''));
                    }
                    
                    // 替换段落内容
                    const newParagraph = oldParagraph.fullTag.replace(oldParagraph.content, modifiedContent);
                    newDocumentXml = newDocumentXml.replace(oldParagraph.fullTag, newParagraph);
                }
            }
            
            // 创建新的压缩文件
            const newZip = new JSZip();
            
            // 复制原始文件的所有内容
            const entries = Object.keys(zip.files);
            for (const entry of entries) {
                if (entry === 'word/document.xml') {
                    // 使用修改后的document.xml
                    newZip.file(entry, newDocumentXml);
                } else {
                    // 复制其他文件
                    const fileData = await zip.file(entry)?.async('nodebuffer');
                    if (fileData) {
                        newZip.file(entry, fileData);
                    }
                }
            }
            
            // 生成新文档
            const newContent = await newZip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });
            
            // 写入文件
            fs.writeFileSync(outputPath, newContent);
            
            return outputPath;
        } catch (error: any) {
            console.error('创建匹配文档时发生错误:', error);
            throw new Error(`创建匹配文档失败: ${error.message}`);
        }
    }

    public async simpleDocxReplace(newText: string, originalDocxPath: string): Promise<string> {
        try {
            // 创建输出文件路径
            const fileInfo = path.parse(originalDocxPath);
            const outputPath = path.join(fileInfo.dir, `${fileInfo.name}_修正后${fileInfo.ext}`);
            
            // 读取原始文档
            const content = fs.readFileSync(originalDocxPath);
            
            // 解压文档
            const zip = new JSZip();
            await zip.loadAsync(content);
            
            // 提取document.xml
            const documentXml = await zip.file('word/document.xml')?.async('string');
            if (!documentXml) {
                throw new Error('无法读取文档内容');
            }

            // 分段修改后的文本
            const paragraphs = newText.split('\n').filter(p => p.trim());
            
            // 简单替换所有文本内容
            let newDocumentXml = documentXml;
            const textRegex = /<w:t(?:\s+[^>]*)?>(.*?)<\/w:t>/g;
            
            // 收集所有文本标签
            const textTags = [];
            let textMatch;
            while ((textMatch = textRegex.exec(documentXml)) !== null) {
                textTags.push({
                    fullTag: textMatch[0],
                    content: textMatch[1],
                    index: textMatch.index
                });
            }
            
            // 准备文本片段
            let allText = paragraphs.join('\n');
            
            // 只替换第一个文本标签，并清空其他标签
            if (textTags.length > 0) {
                // 替换第一个文本
                const firstTag = textTags[0];
                const newTag = firstTag.fullTag.replace(firstTag.content, allText);
                newDocumentXml = newDocumentXml.replace(firstTag.fullTag, newTag);
                
                // 清空其他所有文本
                for (let i = 1; i < textTags.length; i++) {
                    const tag = textTags[i];
                    newDocumentXml = newDocumentXml.replace(tag.fullTag, tag.fullTag.replace(tag.content, ''));
                }
            }
            
            // 更新document.xml
            zip.file('word/document.xml', newDocumentXml);
            
            // 生成新文档
            const newContent = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });
            
            // 写入文件
            fs.writeFileSync(outputPath, newContent);
            
            return outputPath;
        } catch (error: any) {
            console.error('替换Word文档内容时发生错误:', error);
            throw new Error(`替换Word文档内容失败: ${error.message}`);
        }
    }
} 