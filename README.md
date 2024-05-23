## 简介

因为 Google My Maps 实在是太难用了：

- 描述只能用纯文本，没法加粗指定词语（小说作品需要在原文中突出显示巡礼点相关词语）
- 图片上传后会被压缩（巡礼时只能对着糊照找地点）
- 图片只能统一切换显示，无法搭配对应文字（当一个巡礼点出镜多次有很多图片时很难分清哪张是哪张）
- 图片改变排序只能删掉重新添加（维护噩梦）

因此有了本项目，使用 Markdown 格式文档记录所有地点标记信息，再自动转换成标记点显示在地图上。文档文件可以保存在任意网站上（如 GitHub），通过在 `https://mdmap.pages.dev/` 后面加上文档 URL 来加载文档。

## 功能

- 导入导出谷歌地图的 KML 文件
- 支持 Markdown 格式的描述
- 标签分类，并能根据标签颜色自动改变标记点颜色
- 使用搜索功能筛选或排除含有指定关键词或标签的地点
- 在地图上覆盖特定图片（比如商场内部地图）
- 直接复制到微博文章

## 使用例

- 直接把 URL 加在后面

  <https://mdmap.pages.dev/https://raw.githubusercontent.com/hymbz/MarkdownMap/安達としまむら/README.md>

- 加载 GitHub 指定仓库分支下的文档（不以 `.md` 结尾时会自动加上 `/README.md`）

  <https://mdmap.pages.dev/gh/hymbz/MarkdownMap@安達としまむら>

- 加载 Cloudflare Page 上的文档（不以 `.md` 结尾时会自动加上 `/README.md`）

  <https://mdmap.pages.dev/cf/mdmap/安達としまむら> -> <https://mdmap.pages.dev/安達としまむら/README.md>

## 编辑文档

第一次打开 <https://mdmap.pages.dev> 将看到一个带有注释的简单示例，可以据此了解具体语法，并直接在网页中简单编辑文档。之后也可以通过点击编辑器侧边的「示例」按钮来调出示例。

但是，**请不要直接在网页上撰写正式文档**。网页上的编辑框只是用于复制粘贴的中转站或临时简单修改用的，为了防止文档丢失和更好的编辑体验，请在本地的 Markdown 编辑器里进行编辑。

推荐使用 [serve](https://www.npmjs.com/package/serve) 之类的工具为文档所在文件夹创建一个本地文件服务器，然后使用 `https://mdmap.pages.dev/localhost:114514/readme.md` 来预览效果。

## Front Matter 配置

Front Matter 就是文档开头用 `---` 分隔的区域，通过在这里用 YAML 格式声明变量来进行相关配置。并非必需，也可以不配置全使用默认值。

- `baseUrl`：用于设置图片的 baseUrl，默认会自动根据文档 URL 设置。
- `rasterImages`：用于在地图上覆盖指定图片。具体可参见[示例](https://mdmap.pages.dev/gh/hymbz/MarkdownMap@安達としまむら)。

  初衷是用于显示商场内部图片，但因为商场提供的图片大多只是示意图，要想和实际地理位置对齐必须经过[地理配准](https://www.qgistutorials.com/en/docs/3/georeferencing_basics.html)，具体操作比较麻烦并且成品图片会有较大扭曲，所以暂不支持经过正经地理配准的图片，如果有人需要的话欢迎提 issues。

  目前当图片名字以 `_` 开头时，会显示四个用于调整图片四角位置的标记，通过调整长宽来实现简单的地理配准。

- `quoteMd`：用于引用其他文档。

  可将指定文档当作数据库，通过使用相同的标记名来引用相同的标记，并加上新的描述或进行重新排序。相比直接复制，引用文档可以在源文档发生更改后自动响应，不需要跟着改。

  主要是用于：
  - 方便记录 repo：直接引用文档加上吐槽就好，参见[示例](https://mdmap.pages.dev/cf/mdmap/repo/安岛.md)
  - 制定旅游路线：在原有文档上增删地点
  - 合并多个文档：既能单独查看其中一个子文档避免标记全部堆在一起（比如虹团不多分几个的话台场那肯定密密麻麻都是标记），也能在制定旅游计划时合并显示多个不同作品的巡礼点来规划路线，还能支持多人维护不同文档<del>（比如鸡狗分团）</del>。

## 其他功能

编辑器侧边按钮提供了一些阅读以外的功能：

- 导入 KML

  导入从谷歌地图导出的 KML 文件。支持导入单个图层和整个地图。

- 导出 KML

  为每个分组分别导出 KML 文件。不直接导出整个地图是因为谷歌地图一次只能导入一个图层。

  另外，在将导出的 KML 文件导入谷歌地图时，请在空图层上导入，不要在含有标记点上的图层使用「重新导入并替换」，否则图标样式将会失效。

- 更新图片尺寸

  未知尺寸的图片在加载时会导致[网页页面抖动](https://web.dev/articles/optimize-cls?hl=zh-cn#images-without-dimensions)，为此项目使用 `![alt](图片.jpg "1920x1080")` 的格式用于提前设定图片宽高。点击该按钮即可自动获取文档内所有图片的尺寸并修改为正确值。

- 复制 HTML

  微博文章有[剪贴板功能](https://weibo.com/ttarticle/p/show?id=2309404446514125602819)，可以将文档内容连带样式一起复制粘贴进去。点击该按钮即可自动将文档排版为长文并复制。

- 迁移至 SM.MS

  微博文章会自动将复制过去的图片上传至微博图床，但如果图片放在 GitHub 上的话就会因无法访问而上传失败。点击该按钮即可将文档中的图片全部迁移到 SM.MS，并在触发上传限制后自动等待五分钟再继续上传，直至所有图片均迁移完成。

  如果你需要迁移至其他图床的话可以使用 [picgo-plugin-pic-migrater](https://github.com/PicGo/picgo-plugin-pic-migrater/blob/master/README_CN.md)，不过这个插件不会实时修改文档，在任一图片上传失败后就会立刻中断退出导致前功尽弃。

  该按钮需要油猴扩展的支持，只有在安装了 [markdown-map-helper](./map-helper.user.js) 脚本后才会显示。并且需要在文档 Front Matter 部分中加入 `SMMS: <SM.MS token>`。在所有图片迁移完成后会自动删掉 `SMMS:` 行，但还是要注意别不小心把 token 泄露了。
