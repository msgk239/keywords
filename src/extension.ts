import * as vscode from 'vscode';
import * as path from 'path';
import { TypoDictionary } from './typoDictionary';
import { TypoChecker } from './typoChecker';
import { Configuration } from './configuration';
import { DocxHandler } from './modules/docx/docxHandler';
import { TypoListView } from './views/typoListView';
import { TypoRuleManager } from './modules/import-export/typoRuleManager';
import * as fs from 'fs';

// 全局变量
let typoChecker: TypoChecker;
let typoListView: TypoListView;
let docxHandler: DocxHandler;
let typoRuleManager: TypoRuleManager;

/**
 * 激活插件
 * @param context 插件上下文
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('中文错别字检查插件已激活');
    
    // 初始化配置
    const config = new Configuration();
    
    // 初始化各个模块
    const dictionary = new TypoDictionary();
    docxHandler = new DocxHandler();
    typoListView = new TypoListView(context);
    typoRuleManager = new TypoRuleManager();
    
    // 尝试加载错别字文件
    const dictionaryPath = path.join(context.extensionPath, 'resources', 'typoDict.txt');
    try {
        dictionary.loadFromFile(dictionaryPath);
    } catch (error) {
        console.error('无法加载错别字文件:', error);
    }
    
    // 加载自定义错别字规则
    dictionary.loadFromConfig();
    
    // 初始化错别字检查器
    typoChecker = new TypoChecker(dictionary);
    
    // 注册命令
    context.subscriptions.push(
        // 检查文档
        vscode.commands.registerCommand('chinese-typo-checker.checkDocument', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的编辑器');
                return;
            }
            
            const typos = typoChecker.checkDocument(editor.document);
            typoListView.updateTypos(typos);
            
            if (typos.length > 0) {
                vscode.window.showInformationMessage(`发现 ${typos.length} 个错别字`);
            } else {
                vscode.window.showInformationMessage('未发现错别字');
            }
        }),
        
        // 修正所有错别字
        vscode.commands.registerCommand('chinese-typo-checker.fixAllTypos', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的编辑器');
                return;
            }
            
            await typoChecker.fixAllTypos(editor.document, editor);
            
            // 短暂延迟后再重新检查文档
            setTimeout(() => {
                // 修正完成后重新检查文档
                const typos = typoChecker.checkDocument(editor.document);
                typoListView.updateTypos(typos);
                
                if (typos.length > 0) {
                    vscode.window.showInformationMessage(`已修正部分错别字，仍有 ${typos.length} 个错别字`);
                } else {
                    vscode.window.showInformationMessage('所有错别字已修正');
                }
            }, 100);
        }),
        
        // 显示错别字列表
        vscode.commands.registerCommand('chinese-typo-checker.showTypoList', () => {
            vscode.commands.executeCommand('workbench.view.extension.chinese-typo-checker-view');
        }),
        
        // 显示错别字详情
        vscode.commands.registerCommand('chinese-typo-checker.showTypoDetail', (typo: any) => {
            // 调用 typoListView 的方法处理选择
            typoListView.showTypoDetail(typo);
            
            // 在编辑器中跳转到错别字位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.revealRange(typo.range, vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(typo.range.start, typo.range.end);
            }
        })
    );
    
    // 注册文档变更监听器
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (Configuration.isEnabled()) {
                const typos = typoChecker.checkDocument(event.document);
                typoListView.updateTypos(typos);
            }
        })
    );

    // 注册命令：导出错别字规则
    const exportRulesCommand = vscode.commands.registerCommand('chinese-typo-checker.exportRules', async () => {
        try {
            const rules = dictionary.getRules();
            const exportFile = await typoRuleManager.exportRules(rules);
            vscode.window.showInformationMessage(`规则已导出到: ${exportFile}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`导出规则失败: ${error.message}`);
        }
    });

    // 注册命令：导入错别字规则
    const importRulesCommand = vscode.commands.registerCommand('chinese-typo-checker.importRules', async () => {
        try {
            const fileUri = await vscode.window.showOpenDialog({
                filters: { 'JSON Files': ['json'] }
            });
            
            if (fileUri && fileUri[0]) {
                const newRules = await typoRuleManager.importRules(fileUri[0].fsPath);
                const existingRules = dictionary.getRules();
                const mergedRules = typoRuleManager.mergeRules(existingRules, newRules);
                dictionary.setRules(mergedRules);
                vscode.window.showInformationMessage('规则导入成功');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`导入规则失败: ${error.message}`);
        }
    });

    // 注册 Webview 消息处理
    context.subscriptions.push(
        vscode.commands.registerCommand('chinese-typo-checker.replaceText', async (original: string, suggestion: string) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const text = document.getText();
            const newText = text.replace(original, suggestion);
            
            await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                editBuilder.replace(fullRange, newText);
            });
        })
    );

    // 注册所有命令
    context.subscriptions.push(
        exportRulesCommand,
        importRulesCommand
    );
}

/**
 * 停用插件
 */
export function deactivate() {
    if (typoChecker) {
        typoChecker.dispose();
    }
} 