import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { TypoRule } from './modules/import-export/typoRuleManager';
import { Configuration } from './configuration';

// 错别字映射接口
export interface TypoMap {
    [key: string]: string;
}

/**
 * 错别字字典类，负责加载和管理错别字规则
 */
export class TypoDictionary {
    private typoMap: TypoMap = {};
    private rules: TypoRule[] = [];
    
    /**
     * 从文件加载错别字映射
     * @param filePath 错别字文件路径
     */
    public loadFromFile(filePath: string): void {
        // 如果设置为不使用默认规则，则不加载
        if (!Configuration.useDefaultRules()) {
            return;
        }
        
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.parseFileContent(content);
        } catch (error) {
            vscode.window.showErrorMessage(`无法加载错别字文件: ${error}`);
        }
    }
    
    /**
     * 解析文件内容，格式为每行一条"错误词：正确词"
     * @param content 文件内容
     */
    private parseFileContent(content: string): void {
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && trimmedLine.includes('：')) {
                const [typo, correction] = trimmedLine.split('：').map(s => s.trim());
                if (typo && correction) {
                    this.typoMap[typo] = correction;
                    this.rules.push({
                        original: typo,
                        suggestion: correction,
                        enabled: true
                    });
                }
            }
        }
    }
    
    /**
     * 从配置中加载自定义错别字规则
     */
    public loadFromConfig(): void {
        const config = vscode.workspace.getConfiguration('chinese-typo-checker');
        const customRules = config.get<TypoRule[]>('customRules', []);
        
        // 合并自定义规则
        this.rules = this.mergeRules(this.rules, customRules);
        this.updateTypoMap();
        
        // 尝试读取自定义错别字文件
        this.loadFromCustomFile();
    }
    
    /**
     * 从自定义文件加载错别字映射
     */
    private loadFromCustomFile(): void {
        try {
            // 用户目录下的自定义错别字文件
            const userFolder = path.join(process.env.USERPROFILE || process.env.HOME || '', '.chinese-typo-checker');
            const customDictPath = path.join(userFolder, 'customDict.txt');
            
            if (fs.existsSync(customDictPath)) {
                const content = fs.readFileSync(customDictPath, 'utf-8');
                const customRules = this.parseCustomFileContent(content);
                
                // 合并自定义规则（优先级高于默认规则）
                this.rules = this.mergeRules(this.rules, customRules);
                this.updateTypoMap();
            }
        } catch (error) {
            console.error('无法加载自定义错别字文件:', error);
        }
    }
    
    /**
     * 解析自定义文件内容
     * @param content 文件内容
     * @returns 规则列表
     */
    private parseCustomFileContent(content: string): TypoRule[] {
        const lines = content.split('\n');
        const rules: TypoRule[] = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            // 跳过注释和空行
            if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('：')) {
                const [typo, correction] = trimmedLine.split('：').map(s => s.trim());
                if (typo && correction) {
                    rules.push({
                        original: typo,
                        suggestion: correction,
                        enabled: true
                    });
                }
            }
        }
        
        return rules;
    }

    /**
     * 合并规则列表
     * @param existingRules 现有规则
     * @param newRules 新规则
     * @returns 合并后的规则列表
     */
    private mergeRules(existingRules: TypoRule[], newRules: TypoRule[]): TypoRule[] {
        const mergedRules = new Map<string, TypoRule>();
        
        // 添加现有规则
        existingRules.forEach(rule => {
            mergedRules.set(rule.original, rule);
        });

        // 添加或更新新规则
        newRules.forEach(rule => {
            if (mergedRules.has(rule.original)) {
                // 更新现有规则
                const existingRule = mergedRules.get(rule.original)!;
                existingRule.suggestion = rule.suggestion;
                existingRule.enabled = rule.enabled;
            } else {
                // 添加新规则
                mergedRules.set(rule.original, rule);
            }
        });

        return Array.from(mergedRules.values());
    }

    /**
     * 更新错别字映射表
     */
    private updateTypoMap(): void {
        this.typoMap = {};
        this.rules.forEach(rule => {
            if (rule.enabled) {
                this.typoMap[rule.original] = rule.suggestion;
            }
        });
    }

    /**
     * 获取所有错别字规则
     * @returns 错别字规则列表
     */
    public getRules(): TypoRule[] {
        return this.rules;
    }

    /**
     * 设置错别字规则
     * @param rules 错别字规则列表
     */
    public setRules(rules: TypoRule[]): void {
        this.rules = rules;
        this.updateTypoMap();
    }
    
    /**
     * 清空所有规则
     */
    public clearRules(): void {
        this.rules = [];
        this.typoMap = {};
    }
    
    /**
     * 获取所有错别字映射
     * @returns 错别字映射表
     */
    public getAllTypos(): TypoMap {
        return this.typoMap;
    }
    
    /**
     * 获取错别字的修正
     * @param typo 错别字
     * @returns 修正后的词
     */
    public getCorrection(typo: string): string | undefined {
        return this.typoMap[typo];
    }
    
    /**
     * 检查是否为错别字
     * @param word 待检查的词
     * @returns 是否为错别字
     */
    public isTypo(word: string): boolean {
        return word in this.typoMap;
    }
    
    /**
     * 添加错别字规则
     * @param typo 错别字
     * @param correction 修正后的词
     */
    public addTypo(typo: string, correction: string): void {
        this.typoMap[typo] = correction;
        this.rules.push({
            original: typo,
            suggestion: correction,
            enabled: true
        });
    }
} 