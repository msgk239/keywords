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
        vscode.commands.registerCommand('chinese-typo-checker.checkDocument', async (args?: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的编辑器');
                return;
            }
            
            const typos = typoChecker.checkDocument(editor.document);
            typoListView.updateTypos(typos);
            
            // 无论从哪里触发都显示列表
            await vscode.commands.executeCommand('workbench.view.extension.chinese-typo-checker-view');
            
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
        
        // 导入错别字文件
        vscode.commands.registerCommand('chinese-typo-checker.importTypoDictionary', async () => {
            try {
                const fileUri = await vscode.window.showOpenDialog({
                    filters: { 'Text Files': ['txt'] },
                    canSelectMany: false
                });
                
                if (fileUri && fileUri[0]) {
                    const filePath = fileUri[0].fsPath;
                    // 用户目录下的自定义错别字文件
                    const userFolder = path.join(process.env.USERPROFILE || process.env.HOME || '', '.chinese-typo-checker');
                    const customDictPath = path.join(userFolder, 'customDict.txt');
                    
                    // 确保目录存在
                    if (!fs.existsSync(userFolder)) {
                        fs.mkdirSync(userFolder, { recursive: true });
                    }
                    
                    // 读取选择的文件
                    const content = fs.readFileSync(filePath, 'utf-8');
                    
                    // 追加到自定义错别字文件
                    fs.appendFileSync(customDictPath, '\n' + content, 'utf-8');
                    
                    // 重新加载字典
                    dictionary.loadFromConfig();
                    
                    vscode.window.showInformationMessage(`错别字文件导入成功`);
                    
                    // 打开自定义错别字文件
                    const uri = vscode.Uri.file(customDictPath);
                    await vscode.window.showTextDocument(uri);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`导入错别字文件失败: ${error.message}`);
            }
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
        }),
        
        // 检查Word文档错别字
        vscode.commands.registerCommand('chinese-typo-checker.checkDocx', async () => {
            try {
                // 让用户选择.docx文件
                const files = await vscode.window.showOpenDialog({
                    canSelectMany: false,
                    filters: {'Word文档': ['docx']}
                });
                
                if (!files || !files.length) return;
                
                const filePath = files[0].fsPath;
                
                // 显示进度
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "正在处理Word文档",
                }, async (progress) => {
                    progress.report({ message: "正在提取文本..." });
                    
                    // 使用DocxHandler提取文本
                    const text = await docxHandler.convertDocxToText(filePath);
                    
                    progress.report({ message: "正在创建临时文件...", increment: 30 });
                    
                    // 创建临时文件
                    const tempFilePath = await docxHandler.createTempFile(text, filePath);
                    
                    progress.report({ message: "正在检查错别字...", increment: 30 });
                    
                    // 检查错别字
                    const typos = typoChecker.checkText(text);
                    
                    // 保存原始docx路径到工作区状态
                    context.workspaceState.update('originalDocxPath', filePath);
                    
                    // 打开临时文件
                    const uri = vscode.Uri.file(tempFilePath);
                    const doc = await vscode.window.showTextDocument(uri);
                    
                    // 自动检查错别字并显示
                    const fullRange = new vscode.Range(
                        doc.document.positionAt(0),
                        doc.document.positionAt(doc.document.getText().length)
                    );
                    
                    // 更新错别字列表（使用实际行号）
                    const documentTypos = typoChecker.checkDocument(doc.document);
                    typoListView.updateTypos(documentTypos);
                    
                    // 显示错别字列表
                    await vscode.commands.executeCommand('workbench.view.extension.chinese-typo-checker-view');
                    
                    if (typos.length > 0) {
                        vscode.window.showInformationMessage(`发现 ${typos.length} 个错别字，请在临时文件中修改`);
                    } else {
                        vscode.window.showInformationMessage('未发现错别字');
                    }
                });
                
            } catch (error: any) {
                vscode.window.showErrorMessage(`检查Word文档失败: ${error.message}`);
            }
        }),
        
        // 导出为Word文档
        vscode.commands.registerCommand('chinese-typo-checker.exportToDocx', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('没有打开的编辑器');
                    return;
                }
                
                // 获取原始docx路径
                const originalDocxPath = context.workspaceState.get<string>('originalDocxPath');
                if (!originalDocxPath) {
                    vscode.window.showErrorMessage('无法找到原始Word文档路径');
                    return;
                }
                
                // 显示进度
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "正在导出Word文档",
                }, async (progress) => {
                    // 导出为新的Word文档
                    const newDocxPath = await docxHandler.exportToDocx(editor.document.getText(), originalDocxPath);
                    vscode.window.showInformationMessage(`已导出到: ${newDocxPath}`);
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`导出Word文档失败: ${error.message}`);
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

    // 注册命令：打开默认错别字映射表
    const openDictionaryCommand = vscode.commands.registerCommand('chinese-typo-checker.openDictionary', async () => {
        try {
            const dictionaryPath = path.join(context.extensionPath, 'resources', 'typoDict.txt');
            const uri = vscode.Uri.file(dictionaryPath);
            await vscode.window.showTextDocument(uri, { preview: false, preserveFocus: false, viewColumn: vscode.ViewColumn.Active });
            
            // 设置为只读模式
            try {
                await vscode.workspace.fs.stat(uri);
                // 显示提示信息
                vscode.window.showInformationMessage(
                    '默认错别字映射表为只读。若要修改规则，请复制到自定义映射表中。',
                    '如何修改规则?'
                ).then(selection => {
                    if (selection === '如何修改规则?') {
                        vscode.window.showInformationMessage(
                            '1. 使用"打开自定义错别字映射表"命令\n' +
                            '2. 在自定义映射表中添加规则\n' +
                            '3. 自定义规则会覆盖默认规则\n' +
                            '4. 格式为: 错别字：正确词'
                        );
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`无法访问错别字映射表: ${error}`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`打开错别字映射表失败: ${error.message}`);
        }
    });

    // 注册命令：打开自定义错别字映射表
    const openCustomDictionaryCommand = vscode.commands.registerCommand('chinese-typo-checker.openCustomDictionary', async () => {
        try {
            // 用户目录下的自定义错别字文件
            const userFolder = path.join(process.env.USERPROFILE || process.env.HOME || '', '.chinese-typo-checker');
            const customDictPath = path.join(userFolder, 'customDict.txt');
            
            // 确保目录存在
            if (!fs.existsSync(userFolder)) {
                fs.mkdirSync(userFolder, { recursive: true });
            }
            
            // 如果文件不存在，创建空文件
            if (!fs.existsSync(customDictPath)) {
                fs.writeFileSync(customDictPath, '# 自定义错别字映射表\n# 格式：错别字：正确词\n', 'utf-8');
            }
            
            const uri = vscode.Uri.file(customDictPath);
            await vscode.window.showTextDocument(uri);
        } catch (error: any) {
            vscode.window.showErrorMessage(`打开自定义错别字映射表失败: ${error.message}`);
        }
    });

    // 注册命令：导出错别字文件
    const exportTypoDictionaryCommand = vscode.commands.registerCommand('chinese-typo-checker.exportTypoDictionary', async () => {
        try {
            // 获取所有规则
            const rules = dictionary.getRules();
            
            // 创建导出内容
            let content = '# 错别字映射表\n';
            content += '# 格式：错别字：正确词\n\n';
            
            for (const rule of rules) {
                if (rule.enabled) {
                    content += `${rule.original}：${rule.suggestion}\n`;
                }
            }
            
            // 提示用户选择保存位置
            const uri = await vscode.window.showSaveDialog({
                filters: { '文本文件': ['txt'] },
                saveLabel: '导出',
                title: '导出错别字文件'
            });
            
            if (uri) {
                // 写入文件
                fs.writeFileSync(uri.fsPath, content, 'utf-8');
                vscode.window.showInformationMessage(`错别字文件导出成功: ${uri.fsPath}`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`导出错别字文件失败: ${error.message}`);
        }
    });

    // 注册命令：切换使用默认规则
    const toggleDefaultRulesCommand = vscode.commands.registerCommand('chinese-typo-checker.toggleDefaultRules', async () => {
        try {
            // 获取当前设置
            const useDefaultRules = Configuration.useDefaultRules();
            
            // 切换设置
            await vscode.workspace.getConfiguration('chinese-typo-checker').update(
                'useDefaultRules', 
                !useDefaultRules,
                vscode.ConfigurationTarget.Global
            );
            
            // 提示用户
            if (!useDefaultRules) {
                vscode.window.showInformationMessage('已启用默认错别字规则');
            } else {
                vscode.window.showInformationMessage('已禁用默认错别字规则，仅使用自定义规则');
            }
            
            // 重新加载规则
            // 清空当前规则
            dictionary.clearRules();
            
            // 重新加载默认规则（如果启用）
            if (!useDefaultRules) {
                const dictionaryPath = path.join(context.extensionPath, 'resources', 'typoDict.txt');
                try {
                    dictionary.loadFromFile(dictionaryPath);
                } catch (error) {
                    console.error('无法加载错别字文件:', error);
                }
            }
            
            // 加载自定义规则
            dictionary.loadFromConfig();
            
            // 重新检查当前文档
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const typos = typoChecker.checkDocument(editor.document);
                typoListView.updateTypos(typos);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`切换默认规则失败: ${error.message}`);
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
        openDictionaryCommand,
        openCustomDictionaryCommand,
        exportTypoDictionaryCommand,
        toggleDefaultRulesCommand
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