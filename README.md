# 汇率

面向 **iPhone Scripting App** 的法币参考汇率工具，**不是 Scriptable**。仓库名为 `exchange`，App 内名称为「汇率」。仅提供参考汇率与真实日历史，不提供加密货币、银行或卡组织牌价。

## 实现方案

采用官方 **WebViewController + 本地 HTML/CSS/JavaScript**，用于接近参考界面的深色布局。入口为 `index.tsx`；网络请求和持久化由原生代码处理，网页不加载 CDN、不依赖服务器、不使用浏览器 localStorage 保存配置。

- 背景 `#14181b`，六行旗帜/代码/数值/中文名，基准行灰底；底部数据源与 4×4 数字/运算键盘。没有仿制状态栏、小程序胶囊或卡片边框。
- 外观：深色为默认；iPhone 切到浅色（日间）模式时自动使用白底、深色文字和深灰键盘，数据与功能不变。
- 左滑露出青色「汇率详情」；右滑露出蓝色「切换货币」，各占半行宽。
- 使用官方 `addScriptMessageHandler` 接收页面消息；真机反馈证明依赖 postMessage 返回值会报“原生操作失败”，因此 1.0.1 起原生处理完成后用 `evaluateJavaScript` 调用页面 `window.__exchangeReply` 回传结果，页面按请求编号匹配并带 60 秒超时。
- `present({ fullscreen: true })` 等待页面关闭；`finally` 中调用 `dispose()`、`Script.exit()`。菜单中也提供关闭按钮。
- 唯一业务源是 `core.ts`；`web/core.js` 是预编译版本。手机无需 Node、npm 或编译步骤。

本实现参考了官方文档的 WebViewController、FileManager、Storage、fetch、Script API 与脚本元数据说明，并遵循官方示例的模块导入/全局 API 约定。

## 安装与使用

1. 使用当前 App Store 版 **Scripting**。建议升级最新版，以具备本文使用的 Promise WebView 消息桥和文件 API；没有编造未经核验的最低版本字段。
2. 首次安装：[一键导入「汇率」](https://scripting.fun/import_scripts?urls=["https%3A%2F%2Fgithub.com%2FWangsc1%2Fexchange"])。在 iPhone 上使用此链接并交给 Scripting 导入。也可将本目录内容导入脚本，保持相对目录结构；若使用 ZIP，`script.json` 与 `index.tsx` 应位于脚本根目录，不要多包一层目录。不要粘贴到 Scriptable。
3. 手机运行必须包含：`script.json`、`index.tsx`、`core.ts`、`service.ts`、`update.ts` 和整个 `web/`。`scripts/`、`tests/`、`package.json` 仅用于电脑验证，可不导入手机。
4. 首次运行需联网。默认 `USD、CNY、CAD、EUR、GBP、AUD`，初始输入为 `CNY 100`。
5. 点击另一行：把该币种设为输入基准，保持当前金额的等值，而不是把原数值直接移过去。右滑可替换该行；其他行已使用的币种不可重复选择。基准行被替换时同样保留等值。
6. 输入数字可重新输入金额；`+ - × ÷` 支持通常的运算优先级。键盘上方提供 **AC（清空）** 和 **=（结算）**，右下为退格。未完成的算式保留最后有效金额，按等号时显示错误。除零、无效算式和超范围金额会提示。
7. 详情可点击货币对左右币种分别选择基准/目标；详情调整不改变主列表配置。选择列表可按中文名称、英文币种代码、中文国家/地区搜索，显示选中勾与不可重复项。

旗帜采用系统旗帜 emoji；具体字形、Safe Area 和宿主是否保留导航区域须以 iPhone 实际显示为准。

## 真实数据与历史口径

2026-10-13 核验的 Frankfurter **现行官方 API 为 v2**，无需 API Key。虽然 v2 支持多个来源，本工具固定 `providers=ECB`（欧洲央行），避免把来源不同的汇率混合成不清楚的报价。

- 最新行情：`https://api.frankfurter.dev/v2/rates?providers=ECB&base=EUR`
- 货币资料：`/v2/currencies?providers=ECB`
- 日历史：`/v2/rates?providers=ECB&base=AUD&quotes=USD&from=...&to=...`
- 来源属性：`/v2/providers/ECB`，实测 `rate_type = reference rate`、`publish_cadence = daily`。

界面提供当前 ECB 常规发布、且本工具有中文资料的 **30 个法币**，选择列表还会与实际取得的最新行情取交集。「全部」指此数据源支持的工具币种，不是全球所有货币；不会纳入 BTC/USDT 或已经停止发布的币种。

换算以同一日期的 EUR 快照交叉计算：`金额 ÷ 基准币种每EUR报价 × 目标币种每EUR报价`。界面显示真实发布日期，而不是把请求时间伪装成行情日期。ECB 在工作日更新；周末、节假日可能停留在最近工作日。

详情只提供 **7天、1月、6月、1年、3年** 的日历史，分别为截至最新报价日的 7/30/183/365/1095 个日历日。没有「24小时」或虚构盘中点。X 轴使用真实日期间距，周末不补假点。API 可能在区间起点为休市日时携带前一个工作日的报价：程序校验后过滤区间外记录，绝不把旧报价改成周末日期。

最高/最低/平均针对「1 单位基准币种兑换的目标币种汇率」；平均为实际日记录的算术平均，涨跌为 `(末点 / 首点 - 1) × 100%`，不是全天成交价涨跌。历史范围和实际首末日期均显示在详情中。

**数据仅供参考，不是实时成交价、兑换承诺、银行或银行卡结算报价。**

## 缓存、配置与错误

- 使用官方脚本私有 `Storage`，与 `script.json` 分离。保留六币种选择、基准币种和金额；未完成算式不跨运行保存。
- 最新汇率与历史在成功取数和校验后缓存。历史按货币对/周期保留最多 60 份，最新快照和配置不受此淘汰规则影响。未打开过的历史周期不能凭空离线生成。
- HTTP 错误、超时、解析/数据异常会尝试已经取得的真实缓存，并明确标记「离线缓存」、日期和错误原因。
- 无有效缓存时显示错误和破折号，不内置伪造行情。首次离线无法换算。损坏配置恢复默认，损坏行情缓存不能充当报价。
- 原生网络超时为 20 秒。Storage 写入失败会提示；官方说明其磁盘持久化异步进行，不能承诺在强制终止瞬间已经刷盘。
- 本工具不上传用户输入金额或币种配置；汇率请求只包含所需货币对和日期区间。

## 在线检查与更新

设置 → **在线检查更新**，读取固定公开来源：

`https://raw.githubusercontent.com/Wangsc1/exchange/main/version.json`

发现新版本后才显示确认按钮，安装需要再次确认。只从 `Wangsc1/exchange` 的 `main` 分支下载固定白名单程序文件；不接受任意 URL、路径穿越或额外文件。全部下载并读取旧文件后才写入；普通写入错误会尝试恢复旧程序。

**此更新流程绝不下载或覆盖手机 `script.json`，不清空配置/缓存 Storage。** 安装版本另存于 Storage；原生元数据版本可能保留原值，设置检查时显示实际已安装版本。更新成功后关闭并重新运行。

`script.json` 的 `remoteResource.url` 使用官方支持的 Git 仓库格式，**未配置自动更新间隔**。需要保留手机自定义元数据时，请用本脚本的更新流程，不要用重新导入整个脚本来代替更新。

程序托管在公开仓库 `Wangsc1/exchange`。更新清单与白名单程序文件随源码发布；网络或远程文件不可用时会如实显示检查失败，不会假称更新完成。GitHub 文件可下载不代表 iPhone 已成功导入或安装更新。

后续发布者需同步提升 `core.ts`、`script.json`、`version.json` 的版本，重新构建 `web/core.js`，并把白名单文件一起更新到仓库。更新器信任该公开仓库的程序内容；请只使用你控制且信任的来源。安装中请勿强制结束 App：多文件更新不具有系统级原子性，强杀/断电可能需要手动恢复程序文件；手动恢复时仍不要覆盖手机 `script.json` 或清除 Storage。

## 本地验证

电脑需要 Node 20+。开发依赖只用于验证，手机不需要。具有 npm 的电脑可执行：

```sh
npm install
npm run build
npm run check
npm test
npm run test:live
```

如果仅使用临时依赖，可设置 `TYPESCRIPT_PATH` 为 `typescript/lib/typescript.js` 的绝对路径，`HAPPY_DOM_PATH` 为 `happy-dom/lib/index.js` 的绝对路径，再执行同名 Node 脚本。例如：

```sh
node scripts/build.mjs
node scripts/check.mjs
node --test tests/*.test.mjs
node scripts/live-data.mjs
```

`check.mjs` 严格类型检查纯业务/更新模块，检查全部 TS/JS 语法、浏览器构建一致性及元数据。测试覆盖计算、等值基准切换、替换/重复拒绝、搜索、缓存网络/HTTP错误、无缓存/坏缓存、配置保存、日历史/休市边界、双向滑动、详情选择、更新失败回滚、不覆盖 script.json，以及模拟宿主生命周期。

`live-data.mjs` 只读官方文档与真实接口，校验最新行情、五个日历史周期、真实记录及交叉换算方向。测试夹具仅在 `tests/` 中，生产代码从不使用它们。

### 本次验证证据（2026-10-13，北京时间）

- Node `20.19.2`，TypeScript `5.9.3`；纯业务严格类型、全部入口语法和构建一致性通过。
- **29/29** 个本地单元/DOM集成测试通过；DOM 桥与 iOS 宿主在这些测试中为明确的模拟对象。
- 官方 API 返回最新 ECB 日期 **2026-10-12**，30 个币种；CNY 100 的交叉换算为约 USD **14.94146889**，与同日官方货币对（按源接口精度）核对通过。
- AUD→USD：7天/1月/6月/1年/3年分别取得 **5 / 21 / 130 / 255 / 763** 个周期内真实日记录，统计校验通过。
- 已验证真实接口的「休市日起点携带前工作日记录」行为，并加入回归测试。

### 仍需 iPhone 验证的部分

**上述不是 iOS 真机验证。** 当前没有连接 iPhone，也没有取得 App 同步的官方 `.d.ts`；官方开发指南说明这些声明由连接的 App 经 scripting-cli 同步，公开 CLI 包不包含完整宿主类型。本次没有伪造声明或把纯业务检查称为官方宿主完整类型检查。

取得官方声明后，可执行：

```sh
node scripts/check.mjs /绝对路径/官方类型声明目录
```

还需在真实 Scripting 中确认：桥接返回与生命周期、系统 Safe Area/键盘/旗帜渲染、真实触摸滑动、Storage 跨运行持久化、权限/离线体验及本地文件更新。服务器侧的公开文件检查不等于手机上真实导入、更新成功。

## 文件结构

```text
script.json             脚本元数据（App名称：汇率）
index.tsx               原生入口、桥接、生命周期
core.ts                 业务算法与校验
service.ts              Frankfurter取数、Storage缓存/配置
update.ts               白名单更新与错误回滚
version.json            公开更新清单
web/index.html          本地页面模板
web/style.css           深色布局
web/ui.js               交互、手势与真实历史SVG
web/core.js             业务模块预编译产物
scripts/build.mjs       构建浏览器业务脚本
scripts/check.mjs       类型/语法/元数据/构建检查
scripts/live-data.mjs   真实官方接口验证
 tests/                 计算、缓存、更新和DOM集成测试
package.json            电脑验证依赖与命令
```

## 官方资料

- Scripting：[官网](https://scriptingapp.github.io/) · [官方文档索引](https://scriptingapp.github.io/llms.txt) · [官方开发指南](https://github.com/ScriptingApp/scripting-app-development)
- Frankfurter：[官方文档](https://www.frankfurter.dev/) · [现行索引](https://www.frankfurter.dev/llms.txt) · [v2 OpenAPI](https://api.frankfurter.dev/v2/openapi.json)
- ECB：[参考汇率说明](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
