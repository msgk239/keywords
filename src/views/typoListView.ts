import * as vscode from 'vscode';
import { TypoItem } from '../typoChecker';

/**
 * 树视图项代理类，用于避免直接在TreeView中使用TypoItem
 */
class TypoItemNode {
    // 添加ID属性，确保在树视图中有稳定的标识
    public readonly id: string;
    
    constructor(
        public readonly typo: TypoItem,
        public readonly key: string, // 唯一标识
        public selected: boolean = false
    ) {
        // 创建稳定ID，替换所有非单词字符
        this.id = `typo_${key.replace(/\W/g, '_')}`;
    }
}

/**
 * 错别字列表视图提供者
 */
export class TypoListView implements vscode.TreeDataProvider<TypoItemNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TypoItemNode | undefined | null | void> = new vscode.EventEmitter<TypoItemNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TypoItemNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private nodes: TypoItemNode[] = [];
    private treeView: vscode.TreeView<TypoItemNode>;
    private nodeMap: Map<string, TypoItemNode> = new Map();

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
            vscode.commands.registerCommand('chinese-typo-checker.toggleSelection', (node: TypoItemNode) => this.toggleSelection(node)),
            vscode.commands.registerCommand('chinese-typo-checker.toggleAndShowDetail', (node: TypoItemNode) => this.toggleAndShowDetail(node)),
            vscode.commands.registerCommand('chinese-typo-checker.deselectItem', (node: TypoItemNode) => this.deselectItem(node))
        );

        // 监听视图可见性变化
        this.treeView.onDidChangeVisibility(e => {
            if (e.visible && this.nodes.length > 0) {
                // 避免立即显示，给视图一些时间进行初始化
                setTimeout(() => {
                    if (this.nodes.length > 0) {
                        try {
                            this.treeView.reveal(this.nodes[0], { select: false, focus: false });
                        } catch (error) {
                            console.error('无法显示第一个错别字项:', error);
                        }
                    }
                }, 300);
            }
        });
    }

    /**
     * 获取项目的唯一键
     */
    private getTypoKey(typo: TypoItem): string {
        return `${typo.line}_${typo.column}_${typo.original}`;
    }

    /**
     * 获取树节点
     */
    getTreeItem(element: TypoItemNode): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            `${element.typo.original} → ${element.typo.suggestion} (第 ${element.typo.line + 1} 行)`,
            vscode.TreeItemCollapsibleState.None
        );
        
        // 设置唯一ID，使用节点自身的id属性
        treeItem.id = element.id;

        // 设置命令
        treeItem.command = {
            command: 'chinese-typo-checker.toggleSelection',
            title: '切换选择状态',
            arguments: [element]
        };

        // 设置图标和上下文
        treeItem.contextValue = element.selected ? 'selected' : 'unselected';
        treeItem.iconPath = element.selected ? new vscode.ThemeIcon('check') : undefined;
        treeItem.tooltip = `${element.typo.original} → ${element.typo.suggestion}\n第 ${element.typo.line + 1} 行，第 ${element.typo.column + 1} 列\n点击选择或取消`;

        return treeItem;
    }

    /**
     * 获取子节点
     */
    getChildren(element?: TypoItemNode): Thenable<TypoItemNode[]> {
        return Promise.resolve(element ? [] : this.nodes);
    }

    /**
     * 获取父节点
     */
    getParent(element: TypoItemNode): vscode.ProviderResult<TypoItemNode> {
        return null; // 扁平列表，没有父子关系
    }

    /**
     * 更新错别字列表
     */
    public updateTypos(typos: TypoItem[]): void {
        try {
            // 按行号排序
            typos.sort((a, b) => a.line - b.line);
            
            // 清除现有节点并重新创建
            this.nodes = [];
            this.nodeMap.clear();
            
            // 创建新节点
            for (const typo of typos) {
                const key = this.getTypoKey(typo);
                const node = new TypoItemNode(typo, key, false);
                this.nodes.push(node);
                this.nodeMap.set(key, node);
            }
            
            // 通知树视图更新
            this._onDidChangeTreeData.fire();
            
            // 如果有错别字，等待更长时间再尝试显示第一个
            if (this.nodes.length > 0) {
                // 使用更长的延迟，确保树视图完全更新
                setTimeout(() => {
                    this.safeRevealNode(this.nodes[0]);
                }, 500);
            }
        } catch (error) {
            console.error('更新错别字列表时出错:', error);
        }
    }

    /**
     * 安全地显示节点，包含错误处理
     */
    private safeRevealNode(node: TypoItemNode, select: boolean = false): void {
        try {
            // 确保节点在列表中
            if (!this.nodes.includes(node)) {
                return;
            }
            
            // 使用reveal显示节点
            this.treeView.reveal(node, {
                select: select,
                focus: select,
                expand: true
            }).then(undefined, error => {
                // 处理reveal错误
                console.error('无法显示节点:', error);
            });
        } catch (error) {
            console.error('显示节点时出错:', error);
        }
    }

    /**
     * 全选错别字
     */
    private selectAll(): void {
        try {
            // 将所有节点标记为已选择
            for (const node of this.nodes) {
                node.selected = true;
            }
            
            // 通知树视图更新
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('全选错别字时出错:', error);
        }
    }

    /**
     * 取消全选错别字
     */
    private deselectAll(): void {
        try {
            // 将所有节点标记为未选择
            for (const node of this.nodes) {
                node.selected = false;
            }
            
            // 通知树视图更新
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('取消全选错别字时出错:', error);
        }
    }

    /**
     * 应用选中的错别字修改
     */
    private async applySelected(): Promise<void> {
        try {
            // 获取所有已选择的节点
            const selectedNodes = this.nodes.filter(node => node.selected);
            
            if (selectedNodes.length === 0) {
                vscode.window.showWarningMessage('请先选择要修改的错别字');
                return;
            }
            
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的编辑器');
                return;
            }
            
            // 从后向前修改，避免位置变化
            for (let i = selectedNodes.length - 1; i >= 0; i--) {
                const typo = selectedNodes[i].typo;
                await editor.edit(editBuilder => {
                    editBuilder.replace(typo.range, typo.suggestion);
                });
            }
            
            vscode.window.showInformationMessage(`已修改 ${selectedNodes.length} 个错别字`);
            
            // 清空错别字列表
            this.nodes = [];
            this.nodeMap.clear();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('应用选中的错别字修改时出错:', error);
            vscode.window.showErrorMessage('修改错别字时出错');
        }
    }

    /**
     * 切换选择状态
     */
    private toggleSelection(node: TypoItemNode): void {
        try {
            // 切换选择状态
            node.selected = !node.selected;
            
            // 通知树视图更新
            this._onDidChangeTreeData.fire();
            
            // 在编辑器中显示该错别字
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.revealRange(node.typo.range, vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(node.typo.range.start, node.typo.range.end);
            }
        } catch (error) {
            console.error('切换选择状态时出错:', error);
        }
    }

    /**
     * 取消选择单个项目
     */
    private deselectItem(node: TypoItemNode): void {
        try {
            // 取消选择
            node.selected = false;
            
            // 通知树视图更新
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('取消选择单个项目时出错:', error);
        }
    }

    /**
     * 切换选择状态并显示详情
     */
    private toggleAndShowDetail(node: TypoItemNode): void {
        try {
            // 选择该节点
            node.selected = true;
            
            // 通知树视图更新
            this._onDidChangeTreeData.fire();
            
            // 在编辑器中显示该错别字
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.revealRange(node.typo.range, vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(node.typo.range.start, node.typo.range.end);
            }
            
            // 在树视图中显示该节点，使用更长的延迟
            setTimeout(() => {
                this.safeRevealNode(node, true);
            }, 500);
        } catch (error) {
            console.error('切换选择状态并显示详情时出错:', error);
        }
    }

    /**
     * 显示错别字详情
     */
    public showTypoDetail(typo: TypoItem): void {
        try {
            const key = this.getTypoKey(typo);
            
            // 查找现有节点
            let node = this.nodeMap.get(key);
            
            // 如果节点不存在，创建一个新节点
            if (!node) {
                node = new TypoItemNode(typo, key, true);
                this.nodes.push(node);
                this.nodeMap.set(key, node);
                // 通知树视图更新
                this._onDidChangeTreeData.fire();
            } else {
                // 如果节点已存在，选中它
                node.selected = true;
                // 通知树视图更新
                this._onDidChangeTreeData.fire();
            }
            
            // 在编辑器中显示该错别字
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.revealRange(typo.range, vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(typo.range.start, typo.range.end);
            }
            
            // 在树视图中显示该节点，使用更长的延迟
            setTimeout(() => {
                this.safeRevealNode(node!, true);
            }, 500);
        } catch (error) {
            console.error('显示错别字详情时出错:', error);
        }
    }
} 