# 汇率

面向 **iPhone Scripting App**（不是 Scriptable）的法币参考汇率工具。本地 **1.2.0**，本轮未发布GitHub。仅供参考，不是实时成交价、银行或银行卡结算报价，不提供数字货币。

## 原生导航

入口采用官方 `Navigation.present`、`NavigationStack.path`（`Observable<string[]>`）、`NavigationDestination` 和嵌入式 `WebView`。主页、详情、币种选择、设置、源/默认金额单选、小数点设置、法定货币选项都是真实原生目的地，不再把单WebView内部DOM切换称为原生导航。

每个目的地拥有独立 `WebViewController`，仍加载本地HTML/CSS/JS。`navigation.ts`管理共享状态：配置、设置、快照、输入表达式/编辑状态、详情货币对/金额/周期及选择上下文。网页导航消息由原生push/pop，系统手势引起的path变化也使用同一状态恢复与释放路径。

- 已删除全部自绘返回按钮及自定义touch边缘返回手势。
- 用官方 `navigationBarBackButtonHidden={true}` 隐藏系统返回按钮，没有UIKit桥或私有手势接口。宿主关闭机制由 `Navigation.present`提供，不伪造关闭按钮，未额外隐藏系统关闭控件。
- 只dispose弹出页面，被子页覆盖的父页保留；pop后恢复共享状态。退出dispose全部控制器和Observable，最后 `Script.exit()`。
- 页面使用 `postMessage` 请求，原生 `evaluateJavaScript` 调 `window.__exchangeReply` 回传Promise结果，60秒超时。销毁/非当前页面不接收异步回复；刷新与历史token防止旧请求覆盖新数据。已受理保存跨pop保留，后受理写入优先。
- 所有原生页面采用系统默认转场，设置及子页没有附加回弹。主三页也未叠加整页transform回弹：公开API没有已核验的交互返回兼容定制方案，优先不干扰原生手势。**主列表行的跟手滑动及回弹保留**，左右过半仍自动push币种选择/详情。

### 必须真机验收的限制

官方NavigationStack文档说明系统返回会同步path；但 `navigationBarBackButtonHidden` 文档**没有保证隐藏按钮后交互右滑仍可用**。本轮没有iPhone，不能声称已右滑成功。如果当前Scripting/iOS组合在隐藏按钮后禁用了手势，公开文档中没有已核验的强制开启API，本工具不会以自定义touch或虚构UIKit接口掩盖。需手机实测，再决定是否允许显示系统返回按钮或等待官方支持。

验收步骤：
1. 设置→小数点设置→法定货币，右滑逐级返回；滑一半取消应不误pop、不丢值。
2. 详情→币种选择→选择币种应程序pop回详情，再系统右滑回主页；主页左右滑过半应进入对应原生页。
3. 确认隐藏按钮时系统右滑实际可用；若不可用，用宿主关闭机制结束并反馈Scripting/iOS版本，不能算通过验收。
4. 键盘未完成算式进设置再返回应保持表达式；切源后立即返回/关闭、重启，检查配置、金额及无旧源覆盖。
5. 检查深浅色、Safe Area/系统导航栏占用、字体/旗帜、键盘热区、关闭后重启和Storage。电脑模拟无法确认这些真实效果。

官方依据：`Scripting Documentation/webview_controller/en.md`、`webview/en.md`、`use_observable/en.md`、`views/navigation/navigation_stack/en.md`、`view_modifiers/navigation_view_modifiers/en.md`。当前没有App同步的完整官方 `.d.ts`，未虚构宿主声明。

## 换算与外观

- 默认USD、CNY、CAD、EUR、GBP、AUD，基准CNY，初始金额100。主页右上角仅设置按钮，无刷新/更新/版本号。
- 点击货币行将其作为基准，金额使用「货币默认值」（默认100）。替换基准行币种仍保留等值金额；重复币种不可选。货币选择支持中文/代码/国家地区搜索及拼音首字母索引拖动定位，详情选择不修改主列表。
- **只有金额变色**：启动默认灰色；手动数字/小数点输入后，主页全部 `.amount`（含基准）夜间白、日间深色。名称、符号、代码、来源、键盘和设置文字保持原色，基准光标保留。编辑状态在本次原生会话共享，不额外持久化。
- **AC或退格删至表达式不再含数字**，恢复当前 `settings.defaultAmount`（默认100），恢复灰色和fresh状态，其他币种按默认值换算，下次数字替换默认金额。明确输入0仍是有效0且亮色；未完成算式仍含数字时，退格不会提前重置。
- `+ - × ÷`遵循通常优先级，=结算；未完成算式保留最后有效金额，除零/无效/超范围提示。跨原生页面保留未完成表达式；跨脚本运行只保存最后有效金额。
- 延续深浅色变量、内嵌DinLike（Barlow）字体和系统中文字体；字体许可见 `FONT-LICENSE-Barlow-OFL.txt`，无网络字体，不仿制状态栏。

## 换算设置

- 开关40×24px灰色胶囊：开为 `#4d5157` 灰底、14px白点靠右；关为透明底、1.5px灰边框、14px灰点靠左。整行60px热区，保留 `role=switch` / `aria-checked`，浅色同样清晰。
- **货币符号**默认开，控制名称后符号；**显示换算汇率源**默认开，控制主页来源/日期行，不隐藏设置中的永久数据署名。
- **换算汇率源**显示名称、简短说明及对勾；保存后返回设置，立即重新取数，遵守各源缓存和限频。
- **货币默认值**：1/10/100/1,000/10,000，默认100；影响后续基准点击、详情基准金额、恢复列表及AC/删空，不擅自改动正在输入的金额。
- **小数点位数**：设置→「小数点设置」→「法定货币」。新选项仅无（0）/2/4/6/8位，行高64px、标签17px、灰色示例14px（`1,234`、`1,234.00`等）、右侧对勾，无卡片边框。保存后返回小数点设置，当前值即时同步。旧合法0–8位（含奇数）保留至主动新选，默认仍2位，不静默重置。主页/详情金额及最高最低平均按该位数显示，涨跌百分比仍4位。
- **恢复默认币种列表**需confirm二次确认，恢复默认六币、基准CNY和当前默认金额，不重置其余设置或缓存。
- 设置底部「汇率 版本 1.2.0」来自core.ts VERSION。

没有当地货币开关：Intl/navigator.language不能可靠读取系统货币，故不猜测、不修改配置。没有更多设置或数字货币设置，不扩大行情范围。

## 数据源与条款

仅保留 `core.ts CURRENCIES` 内30种法币，可选币种与实际快照取交集。快照统一为 `{date,rates:每EUR兑换}`，金额按 `金额÷基准每EUR报价×目标每EUR报价` 交叉换算。缺默认六币之一即报错，只回退本源真实缓存，不把请求时间冒充报价日期，不把任何源称为实时。

| key | 来源/公开接口 | 频率及免费使用依据 |
|---|---|---|
| ecb（默认） | Frankfurter ECB：`https://api.frankfurter.dev/v2/rates?providers=ECB&base=EUR` | 欧洲央行参考汇率，工作日更新；[ECB使用说明](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html)要求准确引用和署名。 |
| boc | Frankfurter BOC：同一 `/rates?providers=BOC&base=EUR` | 加拿大央行指示汇率，工作日更新，覆盖工具法币23种，日期可能较ECB落后。[条款](https://www.bankofcanada.ca/terms/)允许免费使用/复制/分发，要求署名、说明修改；本工具标明交叉换算，不用央行logo、不宣称背书。 |
| er | `https://open.er-api.com/v6/latest/EUR` | ExchangeRate-API开放端点，166币种、每日更新；[免费说明](https://www.exchangerate-api.com/docs/free)允许个人/商业换算与缓存，要求署名/限频，禁止再分发原始数据。设置页永久提供方链接，无原始数据下载；一小时内最多尝试一次（含失败）。[条款](https://www.exchangerate-api.com/terms)。 |
| fawaz-cdn | `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json` | [开源项目](https://github.com/fawazahmed0/exchange-api)免费、每日更新，[CC0](https://github.com/fawazahmed0/exchange-api/blob/main/LICENSE)。CDN日期可滞后，原始小写代码含加密/金属/旧币，生产仅法币白名单。 |
| fawaz-pages | `https://latest.currency-api.pages.dev/v1/currencies/eur.json` | 同一开源项目Cloudflare端点，每日数据；与CDN独立选择/缓存，可能日期不同，不混合报价。 |
| float | `https://www.floatrates.com/daily/eur.json` | [官方免费JSON feeds](https://www.floatrates.com/json-feeds.html)明确邀请使用，称每12小时更新；146报价，EUR请求基准按1补入，解析字符串汇率/GMT日期。未发现额外公开商业授权条款，免费依据为官方免费feeds，未来政策可能变更。 |

均无需API Key。[Frankfurter文档](https://www.frankfurter.dev/)允许免费使用，单央行数据仍遵守提供方条款。未纳入BOE（部分系列第三方许可不清）、BDI（响应混合日期）、BIS/HKMA（月更偏旧）、BOJ（缺默认币）；其他央行未完成逐项许可核验，不自动纳入。所有中转及非官方接口可能变更/停服，不保证SLA和交易准确性。1.1.0阶段已核验纳入端点，本轮未重复接口研究，可用live-data脚本重新只读核验。

## 历史与缓存

24时/7天继续用Yahoo Finance非官方日内图表（15/30分钟点），以USD中间腿交叉换算；休市停留最近交易时段，数据不足如实报错。1月/6月/1年/3年统一用Frankfurter ECB历史，详情标明「历史走势：ECB」，未适配其他源历史。范围30/183/365/1095日历日，截止当前换算快照日期，真实日期间距、不补周末点，过滤周期起点前记录。

官方私有Storage：`config.v1`保存六币/基准/金额，`settings.v1`保存开关/源/默认金额/小数位。逐字段校验，损坏恢复默认，不因字段顺序误报。

最新缓存独立键：`rates.ecb.v2`、`rates.boc.v1`、`rates.er.v1`、`rates.fawaz-cdn.v1`、`rates.fawaz-pages.v1`、`rates.float.v1`。成功取得时间为各键加 `.fetchedAt`；er额外 `.attemptAt`限制失败重试。er一小时内复用，其余20秒内复用；网络/HTTP/解析失败只回退本源，标明离线、日期和原因。无缓存不合成行情，历史/日内按货币对/周期最多60份。

设置顶部「上次更新 今天/昨天/日期HH:mm」是本源最近成功取得的本地时间，离线不改为当前时间；旧缓存无时间显示暂无记录。网络20秒超时；Storage异步刷盘，不承诺强制终止瞬间持久化。用户金额与配置不上传网络。

## 安装与更新

使用当前Scripting App。[一键导入](https://scripting.fun/import_scripts?urls=["https%3A%2F%2Fgithub.com%2FWangsc1%2Fexchange"])；更新用 **Scripting自带长按更新或一键导入**，保留 `script.json.remoteResource.url`，无应用内更新、无update.ts。

1.2.0本地导入需 `script.json`、`index.tsx`、`navigation.ts`、`core.ts`、`service.ts`及完整 `web/`。core/script/version三处同步1.2.0，version.json保留中文摘要和文件清单。

## 本地验证

```sh
export TYPESCRIPT_PATH=/tmp/chk/node_modules/typescript/lib/typescript.js
export HAPPY_DOM_PATH=/tmp/exchange-validation/node_modules/happy-dom/lib/index.js
node scripts/build.mjs
node scripts/check.mjs
node --test tests/*.test.mjs
# 按需重新核验真实公开接口，不写生产缓存
node scripts/live-data.mjs
```

本轮build/check通过，**50/50测试通过**，输出 `/tmp/exchange-test-1.2.0.txt`。保留数据层/缓存/计算/格式测试；会话类和实际index入口的模拟覆盖push/pop/dispose、隐藏返回属性、异步回复不落销毁页、旧源不覆盖新源、表达式/选择共享、三级小数/奇数兼容、仅金额编辑配色、AC/删空恢复默认及有效0。已删除旧DOM返回和自定义边缘手势测试。

测试运行真实源码，但Navigation宿主、Observable回调和WebView明确模拟，**不等于iPhone真机验证**。check严格检查core/navigation纯模块、入口语法、构建一致性和版本；无官方完整宿主类型。取得App同步声明后可运行 `node scripts/check.mjs /官方声明目录`。

文件：index.tsx原生入口；navigation.ts会话/栈协调；core.ts算法/设置/源解析；service.ts网络/Storage；web/本地UI及生成core.js；scripts/构建/检查/真实接口核验；tests/测试（夹具仅此目录）；FONT-LICENSE-Barlow-OFL.txt字体许可。
