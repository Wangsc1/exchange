# 汇率

面向 **iPhone Scripting App**（不是 Scriptable）的法币参考汇率工具。本地 **1.2.1**，本轮未发布GitHub。仅供参考，不是实时成交价、银行或银行卡结算报价，不提供数字货币。

## 1.2.1 启动恢复

用户反馈1.2.0运行“无反应”。**具体手机根因尚未证实**，没有错误日志、手机Scripting版本或完整官方同步类型，不能把模拟结果当作根因定位。

核查结果：1.2.0在展示前读取文件、构造Observable/会话、安装桥、加载根页后才调用Navigation.present；任一新增导出缺失、根页加载拒绝或等待不结束都可能阻断展示。文档提供NavigationStack/path/NavigationDestination，但Observable构造类说明不足以证明用户手机实际具备其同名导出；官方示例主要用组件内useObservable。正常Promise调度下，加载网页前session已经赋值，不能把“同步构造回调抢先访问session”断言为实际故障。原入口 `run().finally(()=>Script.exit())` 没有启动错误展示，拒绝后退出可能使故障看起来无反应，但尚无证据确认手机触发了哪条路径。

为优先恢复，1.2.1回到此前可打开版本采用的 **单WebViewController + loadHTML + present({fullscreen:true})**，不再导入NavigationStack、NavigationDestination、Observable，也不再依赖navigation.ts。保留最新设置、多源、金额变色和AC/删空语义。await消息桥安装完成后才加载页面，关闭后不再发送异步回复，finally释放控制器并exit。

安装桥、读文件、loadHTML三个启动await步骤分别有30秒等待诊断；错误先记录控制台，再用官方全局Dialog.alert显示“汇率启动失败”、阶段和原因，用户确认后才退出。present正常保持等待关闭，不加错误的30秒自动关闭限制。

### 临时返回方式及代价

**原生导航暂缓**，没有擅自恢复任何自绘返回按钮。子页暂用网页自定义左边缘右滑返回：左侧28px起始，水平超过70px且大于竖向位移。单网页内存保留输入、选择和设置状态；这不是系统原生交互返回，也不具备系统跟手取消效果。设置及子页不回弹；主页/详情/币种选择之间恢复既有方向进入动画，列表行跟手和回弹保留。宿主关闭机制不伪造、不额外隐藏。

### 手机验收与错误信息

本轮没有iPhone，1.2.1是恢复候选，不能声称已经在手机打开。
1. 更新后确认设置底部为1.2.1，启动能显示六行；首次可离线验证页面是否出现，无行情应明确报错，不该无反应。
2. 若出现启动失败弹窗，截图完整“步骤/原因”；从Scripting脚本编辑界面运行，提供任何错误提示或控制台完整日志、Scripting/iOS版本。确认脚本根目录有index.tsx/core.ts/service.ts和完整web目录。
3. 验证临时边缘返回、小数三级页、源切换、数字输入仅金额变色、AC/删空恢复默认及重启持久化。若边缘返回在手机无效，需要用户决定是否恢复显式返回按钮，当前没有自行添加。

官方依据：`Scripting Documentation/webview_controller/en.md`明确loadHTML返回Promise<boolean>、addScriptMessageHandler返回Promise<void>、present等待关闭、dispose释放；`views/dialog/en.md`和同目录官方示例确认全局Dialog.alert。原生导出风险核对使用`use_observable/en.md`、`views/navigation/navigation_stack/en.md`、`view_modifiers/navigation_view_modifiers/en.md`。本地没有完整官方.d.ts，未虚构声明。

## 换算与外观

- 默认USD、CNY、CAD、EUR、GBP、AUD，基准CNY，初始金额100。主页右上角仅设置按钮，无刷新/更新/版本号。
- 点击货币行将其作为基准，金额使用「货币默认值」（默认100）。替换基准行币种仍保留等值金额；重复币种不可选。货币选择支持中文/代码/国家地区搜索及拼音首字母索引拖动定位，详情选择不修改主列表。
- **只有金额变色**：启动默认灰色；手动数字/小数点输入后，主页全部 `.amount`（含基准）夜间白、日间深色。名称、符号、代码、来源、键盘和设置文字保持原色，基准光标保留。编辑状态在本次网页会话保留，不额外持久化。
- **AC或退格删至表达式不再含数字**，恢复当前 `settings.defaultAmount`（默认100），恢复灰色和fresh状态，其他币种按默认值换算，下次数字替换默认金额。明确输入0仍是有效0且亮色；未完成算式仍含数字时，退格不会提前重置。
- `+ - × ÷`遵循通常优先级，=结算；未完成算式保留最后有效金额，除零/无效/超范围提示。跨网页页面保留未完成表达式；跨脚本运行只保存最后有效金额。
- 延续深浅色变量、内嵌DinLike（Barlow）字体和系统中文字体；字体许可见 `FONT-LICENSE-Barlow-OFL.txt`，无网络字体，不仿制状态栏。

## 换算设置

- 开关40×24px灰色胶囊：开为 `#4d5157` 灰底、14px白点靠右；关为透明底、1.5px灰边框、14px灰点靠左。整行60px热区，保留 `role=switch` / `aria-checked`，浅色同样清晰。
- **货币符号**默认开，控制名称后符号；**显示换算汇率源**默认开，控制主页来源/日期行，不隐藏设置中的永久数据署名。
- **换算汇率源**显示名称、简短说明及对勾；保存后返回设置，立即重新取数，遵守各源缓存和限频。
- **货币默认值**：1/10/100/1,000/10,000，默认100；影响后续基准点击、详情基准金额、恢复列表及AC/删空，不擅自改动正在输入的金额。
- **小数点位数**：设置→「小数点设置」→「法定货币」。新选项仅无（0）/2/4/6/8位，行高64px、标签17px、灰色示例14px（`1,234`、`1,234.00`等）、右侧对勾，无卡片边框。保存后返回小数点设置，当前值即时同步。旧合法0–8位（含奇数）保留至主动新选，默认仍2位，不静默重置。主页/详情金额及最高最低平均按该位数显示，涨跌百分比仍4位。
- **恢复默认币种列表**需confirm二次确认，恢复默认六币、基准CNY和当前默认金额，不重置其余设置或缓存。
- 设置底部「汇率 版本 1.2.1」来自core.ts VERSION。

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

1.2.1本地导入需 `script.json`、`index.tsx`、`core.ts`、`service.ts`及完整 `web/`。core/script/version三处同步1.2.1，version.json保留中文摘要和文件清单。

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

本轮build/check通过，**53/53测试通过**，输出 `/tmp/exchange-test-1.2.1.txt`。启动模拟覆盖实际入口的加载/展示/释放顺序、创建/安装桥/读文件/加载/展示失败、await超时显示诊断，以及关闭后丢弃迟到回复。DOM测试覆盖临时边缘返回、设置不回弹、主三页动画、数据与格式、旧奇数位、仅金额变色、AC/删空恢复默认及有效0；保留原源解析/缓存/计算测试。

这些是明确的宿主/DOM模拟，**不等于iPhone启动成功验证**。check严格检查core纯模块、全部入口语法、构建一致性及版本；无官方完整宿主类型。取得App同步声明后可执行 `node scripts/check.mjs /官方声明目录`。

## 币种数量只读核对

当前core.CURRENCIES是原先固定的 **30种法币**：USD、CNY、CAD、EUR、GBP、AUD、BRL、CHF、CZK、DKK、HKD、HUF、IDR、ILS、INR、ISK、JPY、KRW、MXN、MYR、NOK、NZD、PHP、PLN、RON、SEK、SGD、THB、TRY、ZAR。

所有源解析都只保留这个目录，选择页再与snapshot.rates取交集，并按搜索条件显示。源端点有166/146或更多币种，不代表本工具全部展示；此前实测BOC保留23种，其他已纳入源保留30种。常用分组和字母分组可能重复展示同一币种，应按唯一代码计数。这是既有目录/来源覆盖限制，不是本次导航删除了大量币种；本轮没有扩充法币或数字货币，也未重新调查全部真实接口。

文件：index.tsx单WebView入口与启动诊断；core.ts算法/设置/源解析；service.ts网络/Storage；web/本地UI及生成core.js；scripts/构建/检查/真实接口核验；tests/测试（夹具仅此目录）；FONT-LICENSE-Barlow-OFL.txt字体许可。navigation.ts已删除，旧手机残留该文件不会被入口引用。
