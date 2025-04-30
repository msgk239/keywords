import * as vscode from 'vscode';
import { TypoRule } from './modules/import-export/typoRuleManager';

/**
 * 配置管理类，负责管理插件配置
 */
export class Configuration {
    private static readonly CONFIG_SECTION = 'chinese-typo-checker';

    /**
     * 获取工作区配置
     */
    private static getConfig(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(Configuration.CONFIG_SECTION);
    }

    /**
     * 检查是否启用了错别字检查
     */
    public static isEnabled(): boolean {
        const enabled = Configuration.getConfig().get('enabled', true);
        console.log(`配置 enabled: ${enabled}`);
        return enabled;
    }

    /**
     * 检查是否使用默认错别字规则
     */
    public static useDefaultRules(): boolean {
        const useDefault = Configuration.getConfig().get('useDefaultRules', true);
        console.log(`配置 useDefaultRules: ${useDefault}`);
        return useDefault;
    }

    /**
     * 获取自定义错别字规则
     */
    public getCustomRules(): TypoRule[] {
        const rules = Configuration.getConfig().get<TypoRule[]>('customRules', []);
        console.log(`获取到 ${rules.length} 条自定义规则`);
        return rules;
    }

    /**
     * 设置自定义错别字规则
     */
    public async setCustomRules(rules: TypoRule[]): Promise<void> {
        console.log(`设置 ${rules.length} 条自定义规则`);
        await Configuration.getConfig().update('customRules', rules, true);
    }

    /**
     * 检查是否启用了高亮显示
     */
    public isHighlightEnabled(): boolean {
        return Configuration.getConfig().get('highlight.enabled', true);
    }

    /**
     * 获取高亮颜色
     */
    public getHighlightColor(): string {
        return Configuration.getConfig().get('highlight.color', '#ffd700');
    }

    /**
     * 获取支持的文件类型
     * @returns 支持的文件类型数组
     */
    public static getSupportedFileTypes(): string[] {
        return Configuration.getConfig().get('supportedFileTypes', ['markdown', 'plaintext']);
    }

    /**
     * 检查文件类型是否受支持
     * @param document 要检查的文档
     * @returns 是否支持该文件类型
     */
    public static isSupportedFileType(document: vscode.TextDocument): boolean {
        const supportedTypes = Configuration.getSupportedFileTypes();
        return supportedTypes.includes(document.languageId);
    }
}