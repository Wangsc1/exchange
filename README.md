# 汇率

面向 **iPhone Scripting App** 的法币参考汇率工具（不是 Scriptable）。本地版本 **1.1.0**，本轮未发布 GitHub。数据仅供参考，不是实时成交价、银行或银行卡结算报价；不提供数字货币。

## 实现与使用

采用官方 **WebViewController + web/ 本地 HTML/CSS/JS**。入口 `index.tsx` 使用 `addScriptMessageHandler` 接收页面 `postMessage`，原生完成后用 `evaluateJavaScript` 调 `window.__exchangeReply` 回传结果；按请求编号匹配，60 秒超时。网络和 Storage 均由原生完成，不使用网页 localStorage。`present({fullscreen:true})` 等待关闭，最终 `dispose()` 和 `Script.exit()`。

- 主页六行旗帜、代码、数值、中文名称；初始 USD、CNY、CAD、EUR、GBP、AUD，基准 CNY，金额 100。右上角只有线条设置按钮，无刷新和更新按钮，无版本文字。
- 点击货币行，将其作为基准并重置为「货币默认值」（默认 100）。替换基准行币种仍保留当前金额等值；其他行已用币种不能重复。
- 左滑青色「汇率详情」，右滑蓝色「切换货币」。滑过行宽一半松手自动进入；未过半回弹、不停留半开。页面方向动画和行回弹保留，尊重减少动态效果偏好。
- 子页面返回按钮热区至少 88×52；屏幕左边缘 28px 内起始右滑超过 70px，且明显大于竖向位移，可返回。设置二级页返回设置主页。
- 键盘 `+ - × ÷` 遵循运算优先级；AC 清空、= 结算、退格。未完成算式保留最后有效金额，除零、无效算式和超范围提示。输入表达式不被显示小数位强行截断。
- 详情基准金额使用当前「货币默认值」，详情币种修改不影响主页。货币选择支持中文/代码/国家地区搜索、拼音首字母索引拖动定位、右侧对勾。
- 继承深浅色变量和 DinLike 字体。内嵌字体为开源 Barlow，SIL OFL 1.1，许可见 `FONT-LICENSE-Barlow-OFL.txt`；中文使用系统字体。无网络字体，不仿制状态栏。

## 换算设置

顶部显示「上次更新 今天HH:mm / 昨天HH:mm / 日期HH:mm」：取当前源最近一次成功取得汇率的本地时间，不拿它冒充报价日期。成功取得时间随该源单独保存；离线回退不改为当前时间，旧缓存没有时间记录时显示「暂无成功记录」。

- **货币符号**默认开，控制主页名称后的符号。
- **显示换算汇率源**默认开，控制主页来源/日期行；关闭不会删除缓存，也不隐藏设置中的永久数据署名。
- **换算汇率源**单选，显示名称、真实更新频率说明和右侧对勾。切换保存后立即调用该源取数并刷新主页；近期缓存可因限频直接返回。异步旧源响应不能覆盖新源。失败只回退该源缓存，不借用其他源。
- **货币默认值**：1 / 10 / 100 / 1,000 / 10,000，默认 100；影响下一次主页基准点击、详情打开/基准选择及恢复默认列表，不擅自修改正在输入的金额。
- **小数点位数**：法币 0–8 位，默认 2，影响主页换算金额、详情换算金额及最高/最低/平均金额显示。涨跌百分比仍保留原 4 位；基准输入保留用户原始表达式和精度。
- **恢复默认币种列表**居中显示，必须 confirm 二次确认；恢复 USD、CNY、CAD、EUR、GBP、AUD，基准 CNY，金额使用当前默认值。不重置其他设置或缓存。
- 设置主页底部居中显示「汇率 版本 1.1.0」，来自 `core.ts VERSION`。

**未提供「当地货币」开关。** `Intl` 与 `navigator.language` 提供语言/地区，不直接提供系统货币；语言可能没有地区，系统语言地区也不等于用户货币偏好。标准 Intl 没有“读取默认货币”的可靠 API。按用户允许的降级选择不猜测、不强行改动用户列表；未使用 IP 或定位。未添加「更多设置」或数字货币小数位。

## 汇率源、公开接口与条款

2026-10-13 已逐个读取真实端点及公开说明。以下均无需 API Key，生产解析只保留 `core.ts CURRENCIES` 中的 30 种法币，默认六币缺任意一个即报错并尝试本源缓存。可用币种列表与实际快照取交集，BOC 只覆盖其中 23 种。所有快照统一为 `{date, rates: 每EUR兑换}`；金额按 `金额 ÷ 基准每EUR报价 × 目标每EUR报价` 交叉换算。

| key | 名称 / 端点 | 频率、许可及限制 |
|---|---|---|
| ecb（默认） | Frankfurter · 欧洲央行 ECB；`https://api.frankfurter.dev/v2/rates?providers=ECB&base=EUR` | ECB 参考汇率，工作日更新。Frankfurter 为免费公开 API；ECB [免责声明与使用说明](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html)允许再利用公共资料并要求署名，来源在页面据实显示。 |
| boc | Frankfurter · 加拿大央行 BOC；同一 `/rates?providers=BOC&base=EUR` | 指示汇率，工作日更新，EUR 交叉换算。[加拿大央行条款](https://www.bankofcanada.ca/terms/)允许免费使用/复制/分发，要求署名、说明修改和准确性；本工具标明 BOC、交叉换算，不使用其 logo，不声称央行背书。此次日期 10月9日，较 ECB 落后，保留真实日期，不当作实时。 |
| er | ExchangeRate-API；`https://open.er-api.com/v6/latest/EUR` | 166 币种，每日更新。[开放端点说明](https://www.exchangerate-api.com/docs/free)明确允许免费个人/商业换算与缓存，要求署名、限频，禁止再分发原始数据。设置页有永久提供方链接；不提供原始数据下载或转售。同一脚本私有存储的一小时内最多尝试一次此端点（包括失败），启动和切换也遵守；不是固定 API 配额承诺，HTTP 429 如实回退缓存。[条款](https://www.exchangerate-api.com/terms)。 |
| fawaz-cdn | 开源汇率 · jsDelivr；`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json` | [fawazahmed0 项目](https://github.com/fawazahmed0/exchange-api)标示免费、每日更新、无需 Key；[CC0 1.0](https://github.com/fawazahmed0/exchange-api/blob/main/LICENSE)。原始代码为小写，含加密/金属/旧币，生产仅白名单法币；CDN 日期可滞后。 |
| fawaz-pages | 开源汇率 · Cloudflare；`https://latest.currency-api.pages.dev/v1/currencies/eur.json` | 同一开源项目的公开备用域名，每日数据，条款同上。作为单独可选端点、独立缓存，可能与 CDN 日期不同，绝不混合或默默替换。 |
| float | FloatRates；`https://www.floatrates.com/daily/eur.json` | [官方免费 JSON feeds 说明](https://www.floatrates.com/json-feeds.html)邀请直接使用公开链接，称每12小时（12 AM/PM）更新；原始 146 个报价，EUR 本身不在响应中，按请求基准补 EUR=1。报价 rate 为字符串，date 为 GMT 时间；综合参考汇率，不称实时。提供方署名永久保留。本次没有发现额外公开限频/商业授权条款，免费使用依据是上述明确提供的免费 feeds，不保证未来条款不变。 |

Frankfurter [官方文档](https://www.frankfurter.dev/)及 [v2 provider 目录](https://api.frankfurter.dev/v2/providers)用于确认来源属性。仅精选 BOC 作为新增央行来源，未默认纳入整个目录：

- **BOE** 实测覆盖六币、27 条，日期 2026-10-09，但[法律页](https://www.bankofengland.co.uk/legal)明确部分汇率系列来自第三方，不受通用 Open Government Licence 覆盖，复用需联系。不能确定本工具全部所用系列已获授权，因此排除。
- **BDI** 实测 151 条，日期混合 10月12日/9日；不满足本工具同日快照，不纳入，也不将旧日期重写为新日期。
- **BIS、HKMA** 目录最新分别为 9月30日、8月31日且月更，不能作为此次近期工作日参考源；**BOJ** 只有4币，缺 CNY/CAD/GBP/AUD。未纳入。其他 provider 未完成逐个许可核验，未纳入；目录里有来源不等于适合本项目。

这些来源/中转/非官方接口都可能变更或停止服务，不保证 SLA、即时更新或交易准确性。界面始终显示真实数据日期与来源，不把任何源称为“实时”。

## 历史走势

24时、7天保持 **Yahoo Finance 非官方图表接口**，15/30分钟点，以 USD 为中间腿交叉计算；休市停留在最近交易时段。原有 ISK 日内不足问题仍如实报错，不画假曲线。

1月、6月、1年、3年统一使用 **Frankfurter ECB 历史**（30/183/365/1095 日历日），即使最新换算选择其他源也不混为该源历史；详情底部明确显示「历史走势：ECB」。本轮未增加其他提供方的历史适配，fawaz 项目虽有日期端点也未宣称当前支持。历史范围以当前快照日期为截止日，X轴为真实日期间距，周末不补点；接口携带区间起点前的报价会被过滤。最高/最低/平均是实际点统计，涨跌 `(末点 / 首点 - 1) × 100%`。

## 缓存与持久化

官方私有 Storage：`config.v1` 保留六币种/基准/金额；独立 `settings.v1` 保留显示开关、源、默认金额、小数位。逐字段校验，字段顺序不同不误报；损坏恢复默认。设置保存失败提示且不冒充成功。

最新缓存键：`rates.ecb.v2`、`rates.boc.v1`、`rates.er.v1`、`rates.fawaz-cdn.v1`、`rates.fawaz-pages.v1`、`rates.float.v1`，成功取得时间使用各键加 `.fetchedAt`；er 请求尝试另记 `.attemptAt` 用于失败时也限频。每源独立校验、不串用；ECB 保留原缓存键。其他源20秒内复用最近成功缓存，er一小时内复用；请求失败后的一小时内只回退本源缓存，无缓存则提示限频。超出时才网络取数。回到前台超过20秒触发刷新，仍遵守源限频。

HTTP、超时、解析失败仅回退已经取得的本源真实缓存，显示「离线缓存」和原因。无有效缓存显示错误和破折号，不内置行情。历史/日内缓存按货币对/周期最多60份；不清除配置或最新快照。网络20秒超时；Storage 写入可能异步刷盘，不承诺强制终止瞬间持久化。不会上传用户金额或列表配置。

## 安装与更新

使用当前 Scripting App。一键导入：[导入汇率](https://scripting.fun/import_scripts?urls=["https%3A%2F%2Fgithub.com%2FWangsc1%2Fexchange"])。本地导入需包含 `script.json`、`index.tsx`、`core.ts`、`service.ts` 和整个 `web/`，保持目录结构。`scripts/`、`tests/`、`package.json` 仅电脑验证。

更新用 **Scripting 自带长按更新或一键导入**。已删除应用内更新入口及 `update.ts`、版本检查/安装代码；保留 `script.json.remoteResource.url`（长按更新依赖）。`version.json` 保持中文摘要与文件清单，不再列出 update.ts；与 script.json 和 core.ts VERSION 同步为1.1.0。不通过脚本自己写程序文件。

## 本地验证

Node 20+，手机无需编译。可 `npm install` 后运行对应 npm scripts，或用临时依赖：

```sh
export TYPESCRIPT_PATH=/tmp/chk/node_modules/typescript/lib/typescript.js
export HAPPY_DOM_PATH=/tmp/exchange-validation/node_modules/happy-dom/lib/index.js
node scripts/build.mjs
node scripts/check.mjs
node --test tests/*.test.mjs
node scripts/live-data.mjs
```

`check.mjs` 严格检查 core.ts，检查入口语法、JS语法、生成一致性和三处版本。完整宿主类型需 App 同步官方 `.d.ts`，可 `node scripts/check.mjs /官方声明目录`；本轮未提供，不伪造宿主声明。

测试夹具只位于 tests/；覆盖计算/键盘、手势、索引、历史、缓存、设置进入返回/开关/持久化/小数位/默认金额/恢复确认、源解析/缺默认币/独立缓存/限频、版本与更新删除。DOM 与原生桥为明确模拟，不等于 iOS 真机验证。

### 真实接口证据（2026-10-13 22:56，北京时间）

`live-data.mjs` 实际运行通过，逐源解析后日期、原始数/保留法币数如下；数值单位为每EUR兑换：

| 源 | 日期 | 原始/保留 | USD | CNY | CAD | EUR | GBP | AUD |
|---|---|---|---|---|---|---|---|---|
| ECB | 2026-10-13 | 30/30 | 1.1188 | 7.489 | 1.5933 | 1 | .8446 | 1.6033 |
| BOC | 2026-10-09 | 25/23 | 1.1196 | 7.4944 | 1.5978 | 1 | .84634 | 1.6045 |
| ExchangeRate-API | 2026-10-12 | 166/30 | 1.117127 | 7.488851 | 1.594414 | 1 | .845124 | 1.604265 |
| jsDelivr | 2026-10-12 | 339/30 | 1.12004391 | 7.4965493 | 1.59732416 | 1 | .84622581 | 1.60602353 |
| Cloudflare | 2026-10-13 | 340/30 | 1.11751153 | 7.48258698 | 1.59468036 | 1 | .84520585 | 1.60526262 |
| FloatRates | 2026-10-13 | 146/30 | 1.11778798 | 7.48434566 | 1.59465976 | 1 | .84501447 | 1.60519867 |

ECB 1月/6月/1年/3年取得22/130/255/764条，CNY→USD同日官方报价 .14939 交叉核对通过；Yahoo CNY→AUD 24时/7天取得98/240点。输出记录：`/tmp/exchange-live-1.1.0.txt`（临时验证证据，不是生产缓存）。网络结果随时间变化，不保证重跑完全一致。

本轮 `node scripts/build.mjs`、`node scripts/check.mjs` 与 `node --test tests/*.test.mjs` 全部通过，最终 **50/50** 个单元/DOM测试通过。**没有做 iPhone 真机验证**：Safe Area、真实触摸、宿主外链、跨运行 Storage、长按更新实际导入仍需手机验证；不能将电脑模拟称为真机结果。

## 文件结构

`index.tsx`：桥接入口；`core.ts`：算法/源定义/解析/设置校验；`service.ts`：网络与Storage；`script.json`：元数据/remoteResource；`version.json`：版本摘要/文件清单；`web/index.html/style.css/ui.js/core.js`：本地界面与生成业务脚本；`scripts/`：build/check/live-data；`tests/`：单元与DOM集成测试；`FONT-LICENSE-Barlow-OFL.txt`：字体许可。无 update.ts。

官方 Scripting：[文档索引](https://scriptingapp.github.io/llms.txt) · [开发指南](https://github.com/ScriptingApp/scripting-app-development)。
