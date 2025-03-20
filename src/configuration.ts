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
        return Configuration.getConfig().get('enabled', true);
    }

    /**
     * 检查是否使用默认错别字规则
     */
    public static useDefaultRules(): boolean {
        return Configuration.getConfig().get('useDefaultRules', true);
    }

    /**
     * 获取自定义错别字规则
     */
    public getCustomRules(): TypoRule[] {
        return Configuration.getConfig().get('customRules', []);
    }

    /**
     * 设置自定义错别字规则
     */
    public async setCustomRules(rules: TypoRule[]): Promise<void> {
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
} 