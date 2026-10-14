# 汇率

面向 **iPhone Scripting App**（不是 Scriptable）的法币参考汇率工具。当前 **1.3.10**。仅供参考，不是实时成交价、银行或银行卡结算报价，不提供数字货币。

## 页面与返回方式

当前使用 **单WebViewController** 展示本地页面，网页内保留输入、选择和设置状态。子页没有自绘返回按钮；返回暂用网页左边缘右滑（左侧28px起始，水平超过70px且大于竖向位移）。**这不是系统原生导航，也没有系统交互返回的跟手取消效果。** 列表行左右滑超过一半自动进入对应页面，不过半立即回到原位、不半开停留；设置及其子页不加回弹。

恢复原生返回仍有待确认的宿主能力：官方[NavigationStack path文档](https://scriptingapp.github.io/guide/Views/Navigation/NavigationStack/NavigationStack%20with%20path.md)说明系统返回会同步path，但[导航修饰文档](https://scriptingapp.github.io/guide/View%20Modifiers/Navigation%20View%20Modifiers.md)只说明`navigationBarBackButtonHidden`隐藏按钮，没有保证隐藏后交互右滑仍启用，也未公开专门启用该手势的接口。不能将网页touch或CSS动画称为原生返回。

### 启动诊断与手机验证

安装消息桥、读本地文件、loadHTML分别有30秒启动等待诊断。失败先记录控制台，再弹出“汇率启动失败”、步骤和原因，确认后退出；正常展示保持等待用户关闭，关闭后释放控制器并丢弃迟到回复。

出现启动失败时，请提供完整“步骤/原因”截图、编辑器运行错误日志及Scripting/iOS版本。确认脚本根目录存在index.tsx/core.ts/service.ts及完整web目录。手机仍需验证启动、边缘返回、三级小数页、切源、金额输入及重启持久化；桌面模拟不等于手机验收。

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
- 设置底部「汇率 版本 1.3.10」来自core.ts VERSION。

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
| cbr | [俄罗斯央行官方汇率](https://www.cbr.ru/eng/currency_base/daily/)，XML `https://www.cbr.ru/scripts/XML_daily.asp` | 官方[XML接口说明](https://www.cbr.ru/development/SXML/)：无date_req返回最新登记日；每日官方汇率，**日期是生效日，可能在查询日之后**，央行不承诺按此买卖外币。[网站使用协议](https://www.cbr.ru/eng/user_agreement/)要求使用材料需权利人同意并附官网链接。提供XML访问不等于已经取得商业/公开再分发授权；未取得额外许可。 |

SAFE/H.10/InforEuro/CBR直接连接官方；ECB/BOC经Frankfurter取得，不重复添加，不混合报价。

### 单位、方向与日期

- SAFE官方备注：USD/EUR/JPY/HKD/GBP/AUD/NZD/SGD/CHF/CAD为 **100外币兑多少CNY**，先取 `100/报价` 得每CNY外币；其余15币（包括KRW/MYR/HUF等）为 **100CNY兑多少外币**，先取 `报价/100`。以同日EUR腿统一到每EUR，不漏除100，不把日元误当每1日元报价。
- FED H.10除星号外为外币/USD；EUR/AUD/GBP/NZD等星号为USD/外币，先取倒数。归一至每EUR，USD腿为1。选择周报最近一个默认六币齐备的同日列；ND不跨日期填充，非默认币ND从可选交集排除。主页是观测日，不是周报发布日。
- CBR `Value` 为 `Nominal` 个外币兑多少RUB，先取 `Nominal/Value` 得每RUB外币，再以同日EUR腿归一。日元100、韩元1000、印尼盾10000等单位按实际字段处理；卢布只作计算中间腿，未擅自加入30币目录。
- InforEuro响应没有逐日报价日期，服务把官方请求的year/month作为适用期交给解析器；每EUR报价直接保留，EUR必须为1。月份切换时不把上月20秒缓存当作本月在线结果，取数失败可显式离线返回上月真实缓存，仍显示上月适用日。

### 覆盖与现有选择缺币

默认六币USD/CNY/CAD/EUR/GBP/AUD必须齐备；缺失或坏数据只退本源真实缓存，不偷用ECB补币。各源覆盖不同，可选列表以本次有效快照为准，30币目录不扩充。

| 来源 | 目录内参考覆盖数 | 常见缺失目录币 |
|---|---:|---|
| SAFE | 22 | BRL/CZK/IDR/ILS/INR/ISK/PHP/RON |
| H.10 | 21 | CZK/HUF/IDR/ILS/ISK/PHP/PLN/RON/TRY |
| InforEuro | 30 | 无 |
| CBR | 25 | ILS/ISK/MXN/MYR/PHP |

切换源不自动改六行、基准或输入金额：已有缺失非基准行显示破折号，缺失基准保留用户输入但其他换算显示破折号，并提示不覆盖币种。不能点击无报价行设基准或打开换算详情。可替换缺失非基准行；缺失基准无法进行等值折算，明确提示先点击有汇率的行设基准（沿用既有默认金额点击语义），再替换缺失行，或换回覆盖源。不静默改币/改金额，不混源。

### 访问及公开发布限制

全部端点无需API key；HTML/XML/API仍可能因手机网络、站点防护或结构变化不可用，未绕过验证码或访问控制。源码不内嵌行情数据，仅在用户设备取数并存本地私有缓存，不提供原始数据下载/再分发。

**使用边界：SAFE和CBR条款有许可限制。仓库仅提供客户端取数与换算代码，不打包或提供原始行情下载，也未获得权利人商业/公开再分发许可。商业使用、转载或对外提供数据服务前，应另行核实并取得所需许可；不可把公开可访问当作无限授权。** EU和美联储须保留署名、转换说明及非背书声明；设置底部已提供官方链接。

Frankfurter免费API仍遵守各提供方条款。不保证SLA和交易准确性。主页仅显示 `src.name | 日期`（仅附离线/异常警告），长说明仅设置与README显示。

## 历史与缓存

24时/7天继续用Yahoo Finance非官方日内图表（15/30分钟点），以USD中间腿交叉换算；休市停留最近交易时段，数据不足如实报错。1月/6月/1年/3年统一用Frankfurter ECB历史，详情标明「历史走势：ECB」，未适配其他源历史。范围30/183/365/1095日历日，截止当前换算快照日期，真实日期间距、不补周末点，过滤周期起点前记录。

官方私有Storage：`config.v1`保存六币/基准/金额，`settings.v1`保存开关/源/默认金额/小数位。逐字段校验，损坏恢复默认，不因字段顺序误报。

最新缓存独立键：`rates.ecb.v2`、`rates.boc.v1`、`rates.er.v1`、`rates.fawaz-cdn.v1`、`rates.fawaz-pages.v1`、`rates.float.v1`、`rates.safe.v1`、`rates.fed.v1`、`rates.inforeuro.v1`、`rates.cbr.v1`。成功取得时间为各键加 `.fetchedAt`；er额外 `.attemptAt`限制失败重试。er一小时内复用，其余20秒内复用；网络/HTTP/解析失败只回退本源，标明离线、日期和原因。无缓存不合成行情，历史/日内按货币对/周期最多60份。

设置顶部「上次更新 今天/昨天/日期HH:mm」是本源最近成功取得的本地时间，离线不改为当前时间；旧缓存无时间显示暂无记录。网络20秒超时；Storage异步刷盘，不承诺强制终止瞬间持久化。用户金额与配置不上传网络。

## 安装与更新

使用当前Scripting App。[一键导入](https://scripting.fun/import_scripts?urls=["https%3A%2F%2Fgithub.com%2FWangsc1%2Fexchange"])；更新用 **Scripting自带长按更新或一键导入**，保留 `script.json.remoteResource.url`，无应用内更新、无update.ts。

本地导入需 `script.json`、`index.tsx`、`core.ts`、`service.ts`及完整 `web/`。core/script/version三处同步1.3.10，version.json保留中文摘要和文件清单。

## 开发与验证

本地开发需TypeScript和Happy DOM。已安装在自定义路径时，可设置`TYPESCRIPT_PATH`指向TypeScript库文件、`HAPPY_DOM_PATH`指向Happy DOM入口。

```sh
node scripts/build.mjs
node scripts/check.mjs
node --test tests/*.test.mjs
# 只读核验真实接口，不写生产缓存
node scripts/live-data.mjs
```

check严格检查纯业务、入口语法、共享构建一致性及版本；宿主完整类型检查需要用户App同步的官方声明，可执行`node scripts/check.mjs /官方声明目录`。测试中的宿主/DOM模拟有明确边界，不证明iPhone API可用或系统手势行为。需要具体App版本声明时，使用官方[开发流程](https://github.com/ScriptingApp/scripting-app-development/blob/main/references/desktop-cli.md)连接用户自己的Scripting与桌面CLI；声明由App同步，不应伪造。

## 币种目录

core.CURRENCIES固定为 **30种法币**：USD、CNY、CAD、EUR、GBP、AUD、BRL、CHF、CZK、DKK、HKD、HUF、IDR、ILS、INR、ISK、JPY、KRW、MXN、MYR、NOK、NZD、PHP、PLN、RON、SEK、SGD、THB、TRY、ZAR。

所有源只保留该目录，选择页再取实际快照交集。上游包含更多币种不意味着本工具全部展示。常用与字母分组可能重复展示同一币，应按唯一代码计数。

主要文件：index.tsx（单WebView入口/诊断）、core.ts（算法/设置/解析）、service.ts（网络/Storage）、web/（本地UI/生成业务脚本）、scripts/（构建/检查/真实接口核验）、tests/（测试夹具，仅用于测试）、FONT-LICENSE-Barlow-OFL.txt（字体许可）。
