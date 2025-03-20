import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface TypoRule {
    original: string;
    suggestion: string;
    enabled: boolean;
}

export class TypoRuleManager {
    /**
     * 导出错别字规则到文件
     * @param rules 错别字规则列表
     * @returns 导出的文件路径
     */
    public async exportRules(rules: TypoRule[]): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('没有打开的工作区');
        }

        const exportDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'typo-rules');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(exportDir));

        const exportFile = path.join(exportDir, `typo-rules-${new Date().toISOString().split('T')[0]}.json`);
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(exportFile),
            Buffer.from(JSON.stringify(rules, null, 2), 'utf8')
        );

        return exportFile;
    }

    /**
     * 从文件导入错别字规则
     * @param filePath 规则文件路径
     * @returns 导入的规则列表
     */
    public async importRules(filePath: string): Promise<TypoRule[]> {
        try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            const rules = JSON.parse(content.toString());
            
            // 验证规则格式
            if (!Array.isArray(rules)) {
                throw new Error('规则文件格式错误：必须是数组格式');
            }

            return rules.map(rule => ({
                original: rule.original || '',
                suggestion: rule.suggestion || '',
                enabled: rule.enabled ?? true
            }));
        } catch (error: any) {
            throw new Error(`导入规则失败: ${error.message}`);
        }
    }

    /**
     * 合并规则
     * @param existingRules 现有规则
     * @param newRules 新规则
     * @returns 合并后的规则列表
     */
    public mergeRules(existingRules: TypoRule[], newRules: TypoRule[]): TypoRule[] {
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
} 