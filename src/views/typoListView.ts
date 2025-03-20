import * as vscode from 'vscode';
import { TypoItem } from '../typoChecker';

/**
 * 错别字列表视图提供者
 */
export class TypoListView implements vscode.TreeDataProvider<TypoItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TypoItem | undefined | null | void> = new vscode.EventEmitter<TypoItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TypoItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private typos: TypoItem[] = [];
    private selectedItems: Set<string> = new Set();
    private treeView: vscode.TreeView<TypoItem>;
    private itemIdMap: Map<string, TypoItem> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        // 注册视图
        this.treeView = vscode.window.createTreeView('chineseTypos', {
            treeDataProvider: this,
            showCollapseAll: true,
            canSelectMany: true
        });

        // 注册命令
        context.subscriptions.push(
            vscode.commands.registerCommand('chinese-typo-checker.applySelected', () => this.applySelected()),
            vscode.commands.registerCommand('chinese-typo-checker.selectAll', () => this.selectAll()),
            vscode.commands.registerCommand('chinese-typo-checker.deselectAll', () => this.deselectAll()),
            vscode.commands.registerCommand('chinese-typo-checker.toggleSelection', (typo: TypoItem) => this.toggleSelection(typo)),
            vscode.commands.registerCommand('chinese-typo-checker.toggleAndShowDetail', (typo: TypoItem) => this.toggleAndShowDetail(typo)),
            vscode.commands.registerCommand('chinese-typo-checker.deselectItem', (typo: TypoItem) => this.deselectItem(typo))
        );

        // 监听选择变化 - 简化逻辑，避免循环更新
        this.treeView.onDidChangeSelection(e => {
            // 不再在这里修改选择状态，由toggleSelection方法完全控制
            // 这样可以避免循环引用和无法解析树项的问题
        });

        // 监听点击事件
        this.treeView.onDidChangeVisibility(e => {
            if (e.visible) {
                // 当视图可见时，仅显示第一个错别字，但不自动选择
                if (this.typos.length > 0) {
                    // 延迟显示，避免树视图还未准备好
                    setTimeout(() => {
                        if (this.typos.length > 0) {
                            this.treeView.reveal(this.typos[0], { select: false, focus: false });
                        }
                    }, 100);
                }
            }
        });
    }

    /**
     * 获取项目的唯一键
     */
    private getItemKey(item: TypoItem): string {
        return `${item.line}-${item.column}-${item.original}`;
    }

    /**
     * 获取树节点
     */
    getTreeItem(element: TypoItem): vscode.TreeItem {
        const key = this.getItemKey(element);
        const isSelected = this.selectedItems.has(key);
        
        // 使用固定的label，避免每次渲染时生成不同的标签
        const label = `${element.original} → ${element.suggestion} (第 ${element.line + 1} 行)`;
        
        const treeItem = new vscode.TreeItem(
            label,
            vscode.TreeItemCollapsibleState.None
        );
        
        // 设置唯一ID
        treeItem.id = key;
        
        // 点击时切换选择状态并显示详情
        treeItem.command = {
            command: 'chinese-typo-checker.toggleSelection',
            title: '切换选择状态',
            arguments: [element]
        };

        // 只使用图标而不是description
        treeItem.contextValue = isSelected ? 'selected' : 'unselected';
        treeItem.iconPath = isSelected ? new vscode.ThemeIcon('check') : undefined;
        treeItem.tooltip = `${element.original} → ${element.suggestion}\n第 ${element.line + 1} 行，第 ${element.column + 1} 列\n点击选择或取消`;

        return treeItem;
    }

    /**
     * 获取子节点
     */
    getChildren(element?: TypoItem): Thenable<TypoItem[]> {
        return Promise.resolve(this.typos);
    }

    /**
     * 获取父节点
     * @param element 当前元素
     * @returns 父节点元素或undefined
     */
    getParent(element: TypoItem): vscode.ProviderResult<TypoItem> {
        return undefined; // 扁平列表，没有父子关系
    }

    /**
     * 更新错别字列表
     */
    public updateTypos(typos: TypoItem[]): void {
        // 按行号排序
        this.typos = typos.sort((a, b) => a.line - b.line);
        
        // 更新ID映射
        this.itemIdMap.clear();
        typos.forEach(item => {
            this.itemIdMap.set(this.getItemKey(item), item);
        });
        
        this._onDidChangeTreeData.fire();
        
        // 如果有错别字，显示第一个但不自动选择
        if (typos.length > 0) {
            // 先防范性延迟一下再reveal，让树视图有时间更新
            setTimeout(() => {
                if (this.typos.length > 0) {
                    this.treeView.reveal(this.typos[0], { select: false, focus: false });
                }
            }, 100);
        }
    }

    /**
     * 全选错别字
     */
    private selectAll(): void {
        this.typos.forEach(item => {
            this.selectedItems.add(this.getItemKey(item));
        });
        this._onDidChangeTreeData.fire();
        
        // 如果有错别字，更新显示但不自动选择
        if (this.typos.length > 0) {
            setTimeout(() => {
                if (this.typos.length > 0) {
                    this.treeView.reveal(this.typos[0], { select: false, focus: false });
                }
            }, 100);
        }
    }

    /**
     * 取消全选错别字
     */
    private deselectAll(): void {
        this.selectedItems.clear();
        this._onDidChangeTreeData.fire();
    }

    /**
     * 应用选中的错别字修改
     */
    private async applySelected(): Promise<void> {
        const selectedTypos = this.typos.filter(item => 
            this.selectedItems.has(this.getItemKey(item))
        );

        if (selectedTypos.length === 0) {
            vscode.window.showWarningMessage('请先选择要修改的错别字');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }

        // 从后向前修改，避免位置变化
        for (let i = selectedTypos.length - 1; i >= 0; i--) {
            const typo = selectedTypos[i];
            await editor.edit(editBuilder => {
                editBuilder.replace(typo.range, typo.suggestion);
            });
        }

        vscode.window.showInformationMessage(`已修改 ${selectedTypos.length} 个错别字`);
    }

    /**
     * 切换选择状态
     * @param typo 错别字项
     */
    private toggleSelection(typo: TypoItem): void {
        const key = this.getItemKey(typo);
        if (this.selectedItems.has(key)) {
            this.selectedItems.delete(key);
        } else {
            this.selectedItems.add(key);
        }
        this._onDidChangeTreeData.fire();
        
        // 在编辑器中显示该错别字
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.revealRange(typo.range, vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(typo.range.start, typo.range.end);
        }
    }

    /**
     * 取消选择单个项目
     * @param typo 错别字项
     */
    private deselectItem(typo: TypoItem): void {
        const key = this.getItemKey(typo);
        this.selectedItems.delete(key);
        this._onDidChangeTreeData.fire();
    }

    /**
     * 切换选择状态并显示详情
     * @param typo 错别字项
     */
    private toggleAndShowDetail(typo: TypoItem): void {
        // 仅添加到选择列表，不进行切换
        const key = this.getItemKey(typo);
        this.selectedItems.add(key);
        this._onDidChangeTreeData.fire();
        
        // 在编辑器中显示该错别字
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.revealRange(typo.range, vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(typo.range.start, typo.range.end);
        }
        
        // 在列表中高亮该项，确保安全使用
        setTimeout(() => {
            // 确保项目仍然存在
            if (this.typos.includes(typo)) {
                this.treeView.reveal(typo, { select: true, focus: true });
            }
        }, 100);
    }

    /**
     * 显示错别字详情并选择该项
     * @param typo 错别字项
     */
    public showTypoDetail(typo: TypoItem): void {
        // 不再使用toggleAndShowDetail，直接跳转到位置
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.revealRange(typo.range, vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(typo.range.start, typo.range.end);
        }
    }

    /**
     * 确保项目存在于映射中
     * @param key 项目键
     * @returns 对应的项目或undefined
     */
    private getItemByKey(key: string): TypoItem | undefined {
        return this.itemIdMap.get(key);
    }
} 