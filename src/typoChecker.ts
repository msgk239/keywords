import * as vscode from 'vscode';
import { TypoDictionary, TypoMap } from './typoDictionary';

/**
 * 错别字位置信息
 */
export interface TypoItem {
    original: string;
    suggestion: string;
    line: number;
    column: number;
    range: vscode.Range;
}

/**
 * 错别字检查类，负责在文档中查找和修正错别字
 */
export class TypoChecker {
    private dictionary: TypoDictionary;
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor(dictionary: TypoDictionary) {
        this.dictionary = dictionary;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('chineseTypos');
    }
    
    /**
     * 检查当前文档中的错别字
     * @param document 要检查的文档
     * @returns 错别字信息数组
     */
    public checkDocument(document: vscode.TextDocument): TypoItem[] {
        // 清除之前的诊断信息
        this.diagnosticCollection.delete(document.uri);
        
        const text = document.getText();
        const typos: TypoItem[] = [];
        const typoMap = this.dictionary.getAllTypos();
        
        // 为每个错别字检查文档
        for (const typo in typoMap) {
            // 使用正则表达式匹配错别字
            const regex = new RegExp(typo, 'g');
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                const index = match.index;
                const position = document.positionAt(index);
                const range = new vscode.Range(
                    position,
                    position.translate(0, typo.length)
                );

                typos.push({
                    original: typo,
                    suggestion: typoMap[typo],
                    line: position.line,
                    column: position.character,
                    range: range
                });
            }
        }
        
        // 更新诊断信息
        this.updateDiagnostics(document, typos);
        
        return typos;
    }
    
    /**
     * 更新诊断信息
     * @param document 文档
     * @param typos 错别字列表
     */
    private updateDiagnostics(document: vscode.TextDocument, typos: TypoItem[]): void {
        const diagnostics: vscode.Diagnostic[] = typos.map(typo => {
            const diagnostic = new vscode.Diagnostic(
                typo.range,
                `建议修改为：${typo.suggestion}`,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostic.source = '中文错别字检查';
            diagnostic.code = 'chinese-typo';
            return diagnostic;
        });
        
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    
    /**
     * 修正所有错别字
     * @param document 文档
     * @param editor 编辑器
     */
    public async fixAllTypos(document: vscode.TextDocument, editor: vscode.TextEditor): Promise<void> {
        const typos = this.checkDocument(document);
        
        // 从后向前修正，避免位置变化
        for (let i = typos.length - 1; i >= 0; i--) {
            const typo = typos[i];
            await editor.edit(editBuilder => {
                editBuilder.replace(typo.range, typo.suggestion);
            });
        }
        
        // 清除诊断信息
        this.clearDiagnostics();
        
        // 修复完成后重新检查文档
        this.checkDocument(document);
    }
    
    /**
     * 修正单个错别字
     * @param document 文档
     * @param editor 编辑器
     * @param original 原始文本
     * @param suggestion 建议修改为
     */
    public async fixTypo(document: vscode.TextDocument, editor: vscode.TextEditor, original: string, suggestion: string): Promise<void> {
        const text = document.getText();
        const regex = new RegExp(original, 'g');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const index = match.index;
            const position = document.positionAt(index);
            const range = new vscode.Range(
                position,
                position.translate(0, original.length)
            );
            
            await editor.edit(editBuilder => {
                editBuilder.replace(range, suggestion);
            });
        }
        
        // 重新检查文档
        this.checkDocument(document);
    }
    
    /**
     * 清除所有诊断信息
     */
    public clearDiagnostics(): void {
        this.diagnosticCollection.clear();
    }
    
    /**
     * 检查纯文本内容中的错别字（用于DOCX文件等）
     * @param text 要检查的纯文本
     * @returns 错别字信息数组（不包含range）
     */
    public checkText(text: string): Array<{original: string, suggestion: string}> {
        const result: Array<{original: string, suggestion: string}> = [];
        const typoMap = this.dictionary.getAllTypos();
        
        // 为每个错别字检查文本
        for (const typo in typoMap) {
            // 使用正则表达式匹配错别字
            const regex = new RegExp(typo, 'g');
            let match;
            
            // 查找所有匹配项
            while ((match = regex.exec(text)) !== null) {
                result.push({
                    original: typo,
                    suggestion: typoMap[typo]
                });
            }
        }
        
        return result;
    }
    
    /**
     * 释放资源
     */
    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
} 