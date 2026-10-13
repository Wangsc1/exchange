# 汇率

面向 **iPhone Scripting App**（不是 Scriptable）的法币参考汇率工具。本地 **1.3.0**，接续已发布1.2.2；本轮未发布GitHub。仅供参考，不是实时成交价、银行或银行卡结算报价，不提供数字货币。

## 1.2.1 启动恢复

用户反馈1.2.0运行“无反应”。**具体手机根因尚未证实**，没有错误日志、手机Scripting版本或完整官方同步类型，不能把模拟结果当作根因定位。

核查结果：1.2.0在展示前读取文件、构造Observable/会话、安装桥、加载根页后才调用Navigation.present；任一新增导出缺失、根页加载拒绝或等待不结束都可能阻断展示。文档提供NavigationStack/path/NavigationDestination，但Observable构造类说明不足以证明用户手机实际具备其同名导出；官方示例主要用组件内useObservable。正常Promise调度下，加载网页前session已经赋值，不能把“同步构造回调抢先访问session”断言为实际故障。原入口 `run().finally(()=>Script.exit())` 没有启动错误展示，拒绝后退出可能使故障看起来无反应，但尚无证据确认手机触发了哪条路径。

为优先恢复，1.2.1回到此前可打开版本采用的 **单WebViewController + loadHTML + present({fullscreen:true})**，不再导入NavigationStack、NavigationDestination、Observable，也不再依赖navigation.ts。保留最新设置、多源、金额变色和AC/删空语义。await消息桥安装完成后才加载页面，关闭后不再发送异步回复，finally释放控制器并exit。

安装桥、读文件、loadHTML三个启动await步骤分别有30秒等待诊断；错误先记录控制台，再用官方全局Dialog.alert显示“汇率启动失败”、阶段和原因，用户确认后才退出。present正常保持等待关闭，不加错误的30秒自动关闭限制。

### 临时返回方式及代价

**原生导航暂缓**，没有擅自恢复任何自绘返回按钮。子页暂用网页自定义左边缘右滑返回：左侧28px起始，水平超过70px且大于竖向位移。单网页内存保留输入、选择和设置状态；这不是系统原生交互返回，也不具备系统跟手取消效果。设置及子页不回弹；主页/详情/币种选择之间恢复既有方向进入动画，列表行跟手和回弹保留。宿主关闭机制不伪造、不额外隐藏。

### 手机验收与错误信息

本轮没有iPhone，1.2.1是恢复候选，不能声称已经在手机打开。
1. 更新后确认设置底部为1.3.0，启动能显示六行；首次可离线验证页面是否出现，无行情应明确报错，不该无反应。
2. 若出现启动失败弹窗，截图完整“步骤/原因”；从Scripting脚本编辑界面运行，提供任何错误提示或控制台完整日志、Scripting/iOS版本。确认脚本根目录有index.tsx/core.ts/service.ts和完整web目录。
3. 验证临时边缘返回、小数三级页、源切换、数字输入仅金额变色、AC/删空恢复默认及重启持久化。若边缘返回在手机无效，需要用户决定是否恢复显式返回按钮，当前没有自行添加。

官方依据：`Scripting Documentation/webview_controller/en.md`明确loadHTML返回Promise<boolean>、addScriptMessageHandler返回Promise<void>、present等待关闭、dispose释放；`views/dialog/en.md`和同目录官方示例确认全局Dialog.alert。原生导出风险核对使用`use_observable/en.md`、`views/navigation/navigation_stack/en.md`、`view_modifiers/navigation_view_modifiers/en.md`。本地没有完整官方.d.ts，未虚构声明。

## 换算与外观

- 默认USD、CNY、CAD、EUR、GBP、AUD，基准CNY，初始金额100。主页右上角仅设置按钮，无刷新/更新/版本号。
- 点击货币行将其作为基准，金额使用「货币默认值」（默认100）。替换基准行币种仍保留等值金额；重复币种不可选。货币选择支持中文/代码/国家地区搜索及拼音首字母索引拖动定位，详情选择不修改主列表。
- **只有金额变色**：启动默认灰色；手动数字/小数点输入后，主页全部 `.amount`（含基准）夜间白、日间深色。名称、符号、代码、来源、键盘和设置文字保持原色，基准光标保留。编辑状态在本次网页会话保留，不额外持久化。
- **灰显默认金额不可退格**：初始、点击币种、AC及编辑删空恢复后的默认100或自定义默认值，连续退格不改变金额和换算结果。数字键替换默认值进入亮色编辑态后才可逐位退格。**AC或编辑态退格删至表达式不再含数字**，恢复当前 `settings.defaultAmount`（默认100），恢复灰色和fresh状态，其他币种按默认值换算，下次数字替换默认金额。明确输入0仍是有效0且亮色；未完成算式仍含数字时，退格不会提前重置。
- `+ - × ÷`遵循通常优先级，=结算；未完成算式保留最后有效金额，除零/无效/超范围提示。跨网页页面保留未完成表达式；跨脚本运行只保存最后有效金额。
- 延续深浅色变量、内嵌DinLike（Barlow）字体和系统中文字体；字体许可见 `FONT-LICENSE-Barlow-OFL.txt`，无网络字体，不仿制状态栏。

## 换算设置

- 开关40×24px灰色胶囊：开为 `#4d5157` 灰底、14px白点靠右；关为透明底、1.5px灰边框、14px灰点靠左。整行60px热区，保留 `role=switch` / `aria-checked`，浅色同样清晰。
- **货币符号**默认开，控制名称后符号；**显示换算汇率源**默认开，控制主页来源/日期行，不隐藏设置中的永久数据署名。
- **换算汇率源**显示名称、简短说明及对勾；保存后返回设置，立即重新取数，遵守各源缓存和限频。
- **货币默认值**：1/10/100/1,000/10,000，默认100；影响后续基准点击、详情基准金额、恢复列表及AC/删空，不擅自改动正在输入的金额。
- **小数点位数**：设置→「小数点设置」→「法定货币」。新选项仅无（0）/2/4/6/8位，行高64px、标签17px、灰色示例14px（`1,234`、`1,234.00`等）、右侧对勾，无卡片边框。保存后返回小数点设置，当前值即时同步。旧合法0–8位（含奇数）保留至主动新选，默认仍2位，不静默重置。主页/详情金额及最高最低平均按该位数显示，涨跌百分比仍4位。
- **恢复默认币种列表**需confirm二次确认，恢复默认六币、基准CNY和当前默认金额，不重置其余设置或缓存。
- 设置底部「汇率 版本 1.3.0」来自core.ts VERSION。

没有当地货币开关：Intl/navigator.language不能可靠读取系统货币，故不猜测、不修改配置。没有更多设置或数字货币设置，不扩大行情范围。

## 数据源与条款

仅保留 `core.ts CURRENCIES` 内30种法币，可选币种与实际快照取交集。快照统一为 `{date,rates:每EUR兑换}`，金额按 `金额÷基准每EUR报价×目标每EUR报价` 交叉换算。缺默认六币之一即报错，只回退本源真实缓存，不把请求时间冒充报价日期，不把任何源称为实时。

| key | 来源/公开接口 | 频率、访问与使用边界 |
|---|---|---|
| ecb（默认） | Frankfurter ECB：`https://api.frankfurter.dev/v2/rates?providers=ECB&base=EUR` | 欧洲央行参考汇率，工作日更新；[ECB使用说明](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html)要求准确引用和署名。 |
| boc | Frankfurter BOC：同一 `/rates?providers=BOC&base=EUR` | 加拿大央行指示汇率，工作日更新，覆盖工具法币23种，日期可能较ECB落后。[条款](https://www.bankofcanada.ca/terms/)允许免费使用/复制/分发，要求署名、说明修改；本工具标明交叉换算，不用央行logo、不宣称背书。 |
| er | `https://open.er-api.com/v6/latest/EUR` | ExchangeRate-API开放端点，166币种、每日更新；[免费说明](https://www.exchangerate-api.com/docs/free)允许个人/商业换算与缓存，要求署名/限频，禁止再分发原始数据。设置页永久提供方链接，无原始数据下载；一小时内最多尝试一次（含失败）。[条款](https://www.exchangerate-api.com/terms)。 |
| fawaz-cdn | `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json` | [开源项目](https://github.com/fawazahmed0/exchange-api)免费、每日更新，[CC0](https://github.com/fawazahmed0/exchange-api/blob/main/LICENSE)。CDN日期可滞后，原始小写代码含加密/金属/旧币，生产仅法币白名单。 |
| fawaz-pages | `https://latest.currency-api.pages.dev/v1/currencies/eur.json` | 同一开源项目Cloudflare端点，每日数据；与CDN独立选择/缓存，可能日期不同，不混合报价。 |
| float | `https://www.floatrates.com/daily/eur.json` | [官方免费JSON feeds](https://www.floatrates.com/json-feeds.html)明确邀请使用，称每12小时更新；146报价，EUR请求基准按1补入，解析字符串汇率/GMT日期。未发现额外公开商业授权条款，免费依据为官方免费feeds，未来政策可能变更。 |

| safe | [国家外汇管理局人民币中间价](https://www.safe.gov.cn/safe/rmbhlzjj/index.html)，官网内嵌 `https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do` | 官网备注明确来源为中国外汇交易中心；工作日更新。直接读官方HTML表，结构变更/访问拦截时仅退本源缓存。**不是银行交易买卖价**。[SAFE法律声明](https://www.safe.gov.cn/safe/flsm/index.html)：禁止商业性转载，非商业转载需许可并署名。未证明获得再分发许可，不将公开可访问解释为无限商业授权。 |
| fed | [美联储 H.10 官方周报](https://www.federalreserve.gov/releases/h10/current/) | 周报包含每日观测，官方[说明](https://www.federalreserve.gov/releases/h10/about.htm)为纽约午间电汇买入率，周一16:15发布；本工具不是给用户的银行/成交报价。直接读官方HTML，非FRED/Frankfurter中转。[美联储免责声明](https://www.federalreserve.gov/disclaimer.htm)：除特别注明外信息属于公有领域，复制使用须注明来源；不使用官方徽标或冒称背书。 |
| inforeuro | [欧盟委员会 InforEuro](https://commission.europa.eu/funding-and-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en)，官方 `https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates?year=2026&month=10`（运行时请求UTC当前月） | **月度会计汇率，不是日更/实时汇率**，每EUR直接报价；适用于报销等会计换算，官方说明通常取上月倒数第二日市场参考价。本工具日期为请求成功的适用月份首日，非取数日、发布日期或该日市场报价；未发布期错误不伪造数据。[欧盟法律声明](https://commission.europa.eu/legal-notice_en)：通常CC BY 4.0，须署名并说明修改；本工具署名并注明每EUR转换。 |
| cbr | [俄罗斯央行官方汇率](https://www.cbr.ru/eng/currency_base/daily/)，XML `https://www.cbr.ru/scripts/XML_daily.asp` | 官方[XML接口说明](https://www.cbr.ru/development/SXML/)：无date_req返回最新登记日；每日官方汇率，**日期是生效日，可能在查询日之后**，央行不承诺按此买卖外币。[网站使用协议](https://www.cbr.ru/eng/user_agreement/)要求使用材料需权利人同意并附官网链接。提供XML访问不等于已经取得商业/公开再分发授权；本轮未取得额外许可。 |

新增四源均实际直连官方，未因访问限制采用Frankfurter fallback；查询Frankfurter provider CFETS/FRED/INFOREURO/CBR仅用于核对机构身份、频率和pivot，不冒称SAFE发布独立原创报价。ECB/BOC已有来源不重复添加，key和缓存不变。

### 单位、方向与日期

- SAFE官方备注：USD/EUR/JPY/HKD/GBP/AUD/NZD/SGD/CHF/CAD为 **100外币兑多少CNY**，先取 `100/报价` 得每CNY外币；其余15币（包括KRW/MYR/HUF等）为 **100CNY兑多少外币**，先取 `报价/100`。以同日EUR腿统一到每EUR，不漏除100，不把日元误当每1日元报价。
- FED H.10除星号外为外币/USD；EUR/AUD/GBP/NZD等星号为USD/外币，先取倒数。归一至每EUR，USD腿为1。选择周报最近一个默认六币齐备的同日列；ND不跨日期填充，非默认币ND从可选交集排除。主页是观测日，不是周报发布日。
- CBR `Value` 为 `Nominal` 个外币兑多少RUB，先取 `Nominal/Value` 得每RUB外币，再以同日EUR腿归一。日元100、韩元1000、印尼盾10000等单位按实际字段处理；卢布只作计算中间腿，未擅自加入30币目录。
- InforEuro响应没有逐日报价日期，服务把官方请求的year/month作为适用期交给解析器；每EUR报价直接保留，EUR必须为1。月份切换时不把上月20秒缓存当作本月在线结果，取数失败可显式离线返回上月真实缓存，仍显示上月适用日。

### 覆盖与现有选择缺币

新增四源本次实测都覆盖默认USD/CNY/CAD/EUR/GBP/AUD，无需改变“缺默认六币拒绝”政策。解析坏数据或未来某次缺默认币只退本源真实缓存，不偷用ECB补币。30币目录不扩充。

| 新源 | 目录内可用数 | 本次缺目录币 | 日期（2026-10-14 00:12北京时间核验） |
|---|---:|---|---|
| SAFE | 22 | BRL/CZK/IDR/ILS/INR/ISK/PHP/RON | 2026-10-13中间价 |
| H.10 | 21 | CZK/HUF/IDR/ILS/ISK/PHP/PLN/RON/TRY | 2026-10-02观测；官网周报发布日期2026-10-05，没有伪造更新到抓取日 |
| InforEuro | 30 | 无 | 2026-10-01适用月首（原始152币报价） |
| CBR | 25 | ILS/ISK/MXN/MYR/PHP | 2026-10-14生效日 |

切换源不自动改六行、基准或输入金额：已有缺失非基准行显示破折号，缺失基准保留用户输入但其他换算显示破折号，并提示不覆盖币种。不能点击无报价行设基准或打开换算详情。可替换缺失非基准行；缺失基准无法进行等值折算，明确提示先点击有汇率的行设基准（沿用既有默认金额点击语义），再替换缺失行，或换回覆盖源。不静默改币/改金额，不混源。

### 访问及公开发布限制

全部端点无需API key，本次官方访问成功；HTML/XML/API仍可能因手机网络、站点防护或结构变化不可用，未绕过验证码或访问控制。源码不内嵌本次真实数据，仅在用户设备取数并存本地私有缓存，不提供原始数据下载/再分发。

**使用边界：SAFE和CBR条款有许可限制。仓库仅提供客户端取数与换算代码，不打包或提供原始行情下载，也未获得权利人商业/公开再分发许可。商业使用、转载或对外提供数据服务前，应另行核实并取得所需许可；不可把公开可访问当作无限授权。** EU和美联储须保留署名、转换说明及非背书声明；设置底部已提供官方链接。

原有Frankfurter免费API仍遵守各提供方条款。未纳入的其他机构不因本轮自动扩展；不保证SLA和交易准确性。主页保持1.2.2的 `src.name | 日期`（仅附离线/异常警告），长说明仅设置与README显示。

## 历史与缓存

24时/7天继续用Yahoo Finance非官方日内图表（15/30分钟点），以USD中间腿交叉换算；休市停留最近交易时段，数据不足如实报错。1月/6月/1年/3年统一用Frankfurter ECB历史，详情标明「历史走势：ECB」，未适配其他源历史。范围30/183/365/1095日历日，截止当前换算快照日期，真实日期间距、不补周末点，过滤周期起点前记录。

官方私有Storage：`config.v1`保存六币/基准/金额，`settings.v1`保存开关/源/默认金额/小数位。逐字段校验，损坏恢复默认，不因字段顺序误报。

最新缓存独立键：`rates.ecb.v2`、`rates.boc.v1`、`rates.er.v1`、`rates.fawaz-cdn.v1`、`rates.fawaz-pages.v1`、`rates.float.v1`；新增 `rates.safe.v1`、`rates.fed.v1`、`rates.inforeuro.v1`、`rates.cbr.v1`。成功取得时间为各键加 `.fetchedAt`；er额外 `.attemptAt`限制失败重试。er一小时内复用，其余20秒内复用；网络/HTTP/解析失败只回退本源，标明离线、日期和原因。无缓存不合成行情，历史/日内按货币对/周期最多60份。

设置顶部「上次更新 今天/昨天/日期HH:mm」是本源最近成功取得的本地时间，离线不改为当前时间；旧缓存无时间显示暂无记录。网络20秒超时；Storage异步刷盘，不承诺强制终止瞬间持久化。用户金额与配置不上传网络。

## 安装与更新

使用当前Scripting App。[一键导入](https://scripting.fun/import_scripts?urls=["https%3A%2F%2Fgithub.com%2FWangsc1%2Fexchange"])；更新用 **Scripting自带长按更新或一键导入**，保留 `script.json.remoteResource.url`，无应用内更新、无update.ts。

1.3.0本地导入需 `script.json`、`index.tsx`、`core.ts`、`service.ts`及完整 `web/`。core/script/version三处同步1.3.0，version.json保留中文摘要和文件清单。

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

本轮build/check通过，**72/72测试通过**，输出 `/tmp/exchange-test-1.3.0.txt`。新增测试覆盖每源方向/100与多单位/EUR=1/日期/坏数据/缺默认币/独立缓存/配置持久化；UI覆盖已有选择缺币（含缺基准）、灰显100及自定义默认值连续退格不动、编辑删空后继续退格不动、有效0。保留原启动、手势、设置、计算与缓存验证。

真实公开接口脚本完成核验（2026-10-14 00:12北京时间），输出 `/tmp/exchange-live-1.3.0.txt`，**10个最新源、ECB四个历史周期/交叉换算及Yahoo两个日内周期均通过**。SAFE实际100单位直接/间接和CBR实际Nominal100/1000/10000另行按原始字段核对；没有fixture代替网络结果。首次核验脚本因Node VM数组的深等断言错误停止各源检查（不是API缺币），修正为检查缺币数组长度后重新跑全套并取得退出码0。

这些是明确的宿主/DOM模拟，**不等于iPhone启动成功验证**。check严格检查core纯模块、全部入口语法、构建一致性及版本；无官方完整宿主类型。取得App同步声明后可执行 `node scripts/check.mjs /官方声明目录`。

## 币种数量只读核对

当前core.CURRENCIES是原先固定的 **30种法币**：USD、CNY、CAD、EUR、GBP、AUD、BRL、CHF、CZK、DKK、HKD、HUF、IDR、ILS、INR、ISK、JPY、KRW、MXN、MYR、NOK、NZD、PHP、PLN、RON、SEK、SGD、THB、TRY、ZAR。

所有源解析都只保留这个目录，选择页再与snapshot.rates取交集，并按搜索条件显示。源端点有166/146或更多币种，不代表本工具全部展示；本次实测BOC保留23种，原有其余源30种；新增源分别22/21/30/25种，见上表。常用分组和字母分组可能重复展示同一币种，应按唯一代码计数。这是既有目录/来源覆盖限制，不是本次导航删除了大量币种；本轮没有扩充法币或数字货币；已实测新增四源及既有源。

文件：index.tsx单WebView入口与启动诊断；core.ts算法/设置/源解析；service.ts网络/Storage；web/本地UI及生成core.js；scripts/构建/检查/真实接口核验；tests/测试（夹具仅此目录）；FONT-LICENSE-Barlow-OFL.txt字体许可。navigation.ts已删除，旧手机残留该文件不会被入口引用。
