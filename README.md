# 中文错别字检查插件

VS Code的中文错别字检查插件，用于检查和自动修正中文文档中的错别字。

## 功能

- 支持Word文档(.docx)检查和导出
- 自动检查文档中的中文错别字
- 支持一键修正所有错别字
- 支持自定义错别字规则
- 支持导入/导出错别字规则

## 安装方法

VS Code：
1. 下载插件的.vsix文件
2. 打开VS Code，点击左侧扩展图标，点击"..."，选择"从VSIX安装..."
3. 选择下载好的.vsix文件

cursor：
1. 下载插件的.vsix文件
2. 打开cursor的扩展页面
3. 直接把下载好的.vsix文件拖拽到页面中

（也可以直接右键点击.vsix文件，打开方式选择VS Code或cursor，再右键点击该文件，选择“安装扩展VSIX”）

## 命令列表

### 文档检查命令

- `检查中文错别字` (chinese-typo-checker.checkDocument)
  - 功能：检查当前打开文档中的中文错别字
  - 触发方式：右键菜单或命令面板
  - 效果：在左侧错别字列表视图中显示所有发现的错别字

- `修正所有错别字` (chinese-typo-checker.fixAllTypos)
  - 功能：一键修正当前文档中的所有错别字
  - 触发方式：右键菜单或命令面板
  - 效果：自动替换所有已知的错别字为正确用词

- `显示错别字列表` (chinese-typo-checker.showTypoList)
  - 功能：显示错别字列表视图
  - 触发方式：命令面板
  - 效果：在左侧显示错别字列表面板

### 错别字列表视图命令

- `应用选中的修正` (chinese-typo-checker.applySelected)
  - 功能：仅修正选中的错别字
  - 位置：错别字列表视图工具栏

- `全选` (chinese-typo-checker.selectAll)
  - 功能：选中所有错别字
  - 位置：错别字列表视图工具栏

- `取消全选` (chinese-typo-checker.deselectAll)
  - 功能：取消所有错别字的选中状态
  - 位置：错别字列表视图工具栏

### 错别字规则管理命令

- `打开默认错别字映射表` (chinese-typo-checker.openDictionary)
  - 功能：查看内置的错别字规则
  - 触发方式：命令面板
  - 说明：此文件为只读，修改需使用自定义映射表

- `打开自定义错别字映射表` (chinese-typo-checker.openCustomDictionary)
  - 功能：编辑自定义错别字规则
  - 触发方式：命令面板
  - 说明：添加的规则会优先于默认规则

- `导入错别字文件` (chinese-typo-checker.importTypoDictionary)
  - 功能：从外部txt文件导入错别字规则
  - 触发方式：命令面板
  - 格式要求：每行一条规则，格式为"错误词：正确词"

- `导出错别字文件` (chinese-typo-checker.exportTypoDictionary)
  - 功能：将当前所有规则导出为txt文件
  - 触发方式：命令面板
  - 说明：包含启用状态的所有规则

- `切换是否使用错别字默认规则` (chinese-typo-checker.toggleDefaultRules)
  - 功能：快速开启或关闭内置规则
  - 触发方式：命令面板
  - 说明：关闭后仅使用自定义规则

## 使用方法

### Word文档支持（主要功能）

#### 检查Word文档中的错别字
1. 打开VS Code软件
2. 随便打开一个文件夹
3. **鼠标右键点击编辑器区域**，选择"**检查Word文档错别字**"
4. 选择需要检查的.docx文件
5. 错别字会自动在左侧错别字列表视图中显示出来
6. 可以在列表中勾选需要修正的错别字

#### 将文本导出为Word文档
1. 在错别字修正后
2. **鼠标右键点击编辑器区域**，选择"**导出为Word文档**"
3. 导出的Word文档会自动保存，默认文件名是原文件名加上"已修正"
4. 导出文档会保持原文的段落结构和基本格式

#### Word文档使用小贴士
- 保持原始Word文档的备份，以防万一
- Word文档转换过程中可能会丢失一些复杂格式
- 导出的Word文档会保留原文的段落结构
- 插件会自动处理常见的中文标点和格式问题
- 对于较大的Word文档，处理可能需要几秒钟时间

### 基本使用

1. 打开txt或者md文本文件
2. **鼠标右键点击文档**，在弹出菜单中选择"**检查中文错别字**"
3. 插件会自动扫描文档，并在左侧显示错别字列表
4. **鼠标右键点击文档**，选择"**修正所有错别字**"即可一键修正全部错误

### 错别字列表视图

错别字检查后会自动在左侧显示错别字列表，包含：
- 所有发现的错别字及建议修改内容
- 每个错别字条目可以单独勾选或取消
- 工具栏按钮：
  - "**应用选中的修正**"：只修正你勾选的错别字
  - "**全选**"：选中所有错别字
  - "**取消全选**"：取消所有选择

### 错别字规则管理

以下命令在F1命令面板中可用（按F1键，输入"错别字"）：
- "**导入错别字文件**"：从外部txt文件导入自定义规则（格式为"错误词:正确词"，每行一条）
- "**导出错别字文件**"：将当前所有规则导出为txt文件备份
- "**打开默认错别字映射表**"：查看插件内置的错别字规则
- "**打开自定义错别字映射表**"：编辑你自己添加的错别字规则
- "**切换是否使用错别字默认规则**"：快速开启或关闭内置规则
- "**显示错别字列表**"：显示当前文档中检测到的所有错别字

## 自定义配置

可在VS Code扩展设置中调整以下选项：
- `chinese-typo-checker.enabled`: 是否启用错别字检查（默认开启）
- `chinese-typo-checker.useDefaultRules`: 是否使用默认错别字规则（默认开启）
- `chinese-typo-checker.customRules`: 自定义错别字规则列表
- `chinese-typo-checker.highlight.enabled`: 是否高亮显示错别字（默认开启）
- `chinese-typo-checker.highlight.color`: 错别字高亮颜色（默认红色 #FF0000）

## 常见问题解答

**Q: 如何添加自定义错别字规则？**
A: 按F1打开命令面板，输入"打开自定义错别字映射表"，按照格式添加规则。

**Q: 如何快速查看所有错别字？**
A: 执行检查后，错别字列表会自动显示在左侧视图中。

**Q: 能否批量处理多个文件？**
A: 目前版本暂不支持，后续版本将添加此功能。

**Q: 错别字规则存储在哪里？**
A: 规则存储在VS Code的用户设置中，可以通过命令面板打开进行查看和编辑。

## 后续优化方向

- 进一步完善对.docx格式的支持，优化导出的字体大小，颜色等
- 自定义导出的docx主题，如字号、颜色、特定词语的样式等
- 手动改错别字自动监控，自动更新错别字映射表
- 基于NLP的智能识别，分词器用pkuseg
- 添加错别字统计报告
- 支持批量文件处理
- 优化性能，避免大文件处理卡顿
- 确保替换操作可撤销
- 提供更清晰的操作提示
- 保护用户文档安全
