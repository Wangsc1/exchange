// 此文件由 scripts/build.mjs 自动生成，请修改 core.ts 后重新构建。
const Core = (() => { const exports = {};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCES = exports.VERSION = exports.PERIODS = exports.CURRENCIES = exports.DEFAULT_CODES = void 0;
exports.flag = flag;
exports.search = search;
exports.validDate = validDate;
exports.parseLatest = parseLatest;
exports.validateSnapshot = validateSnapshot;
exports.normalizeConfig = normalizeConfig;
exports.convert = convert;
exports.changeBase = changeBase;
exports.replaceCurrency = replaceCurrency;
exports.calculate = calculate;
exports.keyInput = keyInput;
exports.historyRange = historyRange;
exports.parseHistory = parseHistory;
exports.statistics = statistics;
exports.cached = cached;
exports.parseYahoo = parseYahoo;
exports.crossIntraday = crossIntraday;
exports.validateIntraday = validateIntraday;
exports.normalizeSettings = normalizeSettings;
exports.parseSource = parseSource;
exports.parseSAFE = parseSAFE;
exports.parseCBR = parseCBR;
exports.parseFED = parseFED;
exports.inforEuroRequest = inforEuroRequest;
exports.parseInforEuro = parseInforEuro;
exports.DEFAULT_CODES = ['USD', 'CNY', 'CAD', 'EUR', 'GBP', 'AUD'];
// 当前 ECB 常规发布的法币；没有行情的币种不会出现在选择列表中。
exports.CURRENCIES = [
    ['USD', '美元', '美国', 'US', '$'], ['CNY', '人民币', '中国', 'CN', '¥'], ['CAD', '加元', '加拿大', 'CA', '$'], ['EUR', '欧元', '欧盟 欧元区 德国 法国 意大利 西班牙', 'EU', '€'], ['GBP', '英镑', '英国', 'GB', '£'], ['AUD', '澳元', '澳大利亚', 'AU', '$'],
    ['BRL', '巴西雷亚尔', '巴西', 'BR', 'R$'], ['CHF', '瑞士法郎', '瑞士 列支敦士登', 'CH', 'CHF'], ['CZK', '捷克克朗', '捷克', 'CZ', 'Kč'], ['DKK', '丹麦克朗', '丹麦', 'DK', 'kr'], ['HKD', '港元', '中国香港', 'HK', '$'], ['HUF', '匈牙利福林', '匈牙利', 'HU', 'Ft'], ['IDR', '印尼盾', '印度尼西亚', 'ID', 'Rp'], ['ILS', '以色列新谢克尔', '以色列', 'IL', '₪'], ['INR', '印度卢比', '印度', 'IN', '₹'], ['ISK', '冰岛克朗', '冰岛', 'IS', 'kr'], ['JPY', '日元', '日本', 'JP', '¥'], ['KRW', '韩元', '韩国', 'KR', '₩'], ['MXN', '墨西哥比索', '墨西哥', 'MX', '$'], ['MYR', '马来西亚林吉特', '马来西亚', 'MY', 'RM'], ['NOK', '挪威克朗', '挪威', 'NO', 'kr'], ['NZD', '新西兰元', '新西兰', 'NZ', '$'], ['PHP', '菲律宾比索', '菲律宾', 'PH', '₱'], ['PLN', '波兰兹罗提', '波兰', 'PL', 'zł'], ['RON', '罗马尼亚列伊', '罗马尼亚', 'RO', 'Lei'], ['SEK', '瑞典克朗', '瑞典', 'SE', 'kr'], ['SGD', '新加坡元', '新加坡', 'SG', '$'], ['THB', '泰铢', '泰国', 'TH', '฿'], ['TRY', '土耳其里拉', '土耳其', 'TR', '₺'], ['ZAR', '南非兰特', '南非', 'ZA', 'R']
].map(([code, name, region, country, symbol]) => ({ code, name, region, country, symbol }));
function flag(country) { return [...country].map(x => String.fromCodePoint(127397 + x.charCodeAt(0))).join(''); }
function search(query, available) { const q = query.trim().toLowerCase(); return exports.CURRENCIES.filter(c => available.includes(c.code) && `${c.code} ${c.name} ${c.region}`.toLowerCase().includes(q)); }
function validDate(s) { if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s))
    return false; const d = new Date(s + 'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s; }
function parseLatest(data) {
    if (!Array.isArray(data) || !data.length)
        throw new Error('数据源未返回汇率');
    const rates = {};
    let date = '';
    for (const r of data) {
        if (!r || r.base !== 'EUR' || !validDate(r.date) || !exports.CURRENCIES.some(c => c.code === r.quote) || !Number.isFinite(r.rate) || r.rate <= 0 || rates[r.quote] !== undefined)
            throw new Error('汇率数据格式异常');
        if (date && date !== r.date)
            throw new Error('汇率日期不一致');
        date = r.date;
        rates[r.quote] = r.rate;
    }
    if (rates.EUR !== 1 || exports.DEFAULT_CODES.some(c => !rates[c]))
        throw new Error('缺少默认币种汇率');
    return { date, rates };
}
function validateSnapshot(value) {
    const s = value;
    if (!s || !s.rates || !validDate(s.date))
        throw new Error('缓存损坏');
    return parseLatest(Object.entries(s.rates).map(([quote, rate]) => ({ base: 'EUR', quote, rate, date: s.date })));
}
function normalizeConfig(value) {
    const c = value;
    if (!c || !Array.isArray(c.codes) || c.codes.length !== 6 || new Set(c.codes).size !== 6 || c.codes.some(x => !exports.CURRENCIES.some(y => y.code === x)) || !c.codes.includes(c.base) || !Number.isFinite(c.amount) || Math.abs(c.amount) > 1e15)
        return { codes: [...exports.DEFAULT_CODES], base: 'CNY', amount: 100 };
    return { codes: [...c.codes], base: c.base, amount: c.amount };
}
function convert(amount, base, target, s) {
    if (!s.rates[base] || !s.rates[target])
        throw new Error('该币种当前没有汇率');
    const result = amount / s.rates[base] * s.rates[target];
    if (!Number.isFinite(result) || Math.abs(result) > 1e15)
        throw new Error('金额超出范围');
    return result;
}
function changeBase(c, target, s) {
    if (!c.codes.includes(target))
        throw new Error('请选择列表中的币种');
    return { ...c, base: target, amount: convert(c.amount, c.base, target, s) };
}
function replaceCurrency(c, index, target, s) {
    if (!Number.isInteger(index) || index < 0 || index >= 6 || !s.rates[target])
        throw new Error('无法切换此币种');
    if (c.codes[index] === target)
        return c;
    if (c.codes.includes(target))
        throw new Error('该币种已在其他行中');
    const next = { ...c, codes: [...c.codes] };
    next.codes[index] = target;
    if (c.base === c.codes[index]) {
        next.amount = convert(c.amount, c.base, target, s);
        next.base = target;
    }
    return next;
}
// 两级优先级递归下降：支持一元正负、小数，拒绝非法字符；绝不使用 eval。
function calculate(expression) {
    const text = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, '');
    if (!text || text.length > 160 || /[^0-9.+\-*/]/.test(text))
        throw new Error('算式无效');
    let i = 0;
    function number() { let sign = 1; if (text[i] === '+' || text[i] === '-') {
        if (text[i++] === '-')
            sign = -1;
    } ; const m = text.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/); if (!m)
        throw new Error('算式未完成'); i += m[0].length; return sign * Number(m[0]); }
    function term() { let v = number(); while (text[i] === '*' || text[i] === '/') {
        const op = text[i++], r = number();
        if (op === '/' && r === 0)
            throw new Error('不能除以零');
        v = op === '*' ? v * r : v / r;
    } return v; }
    let result = term();
    while (text[i] === '+' || text[i] === '-') {
        const op = text[i++], r = term();
        result = op === '+' ? result + r : result - r;
    }
    if (i !== text.length || !Number.isFinite(result) || Math.abs(result) > 1e15)
        throw new Error('算式无效或金额超出范围');
    return Number(result.toPrecision(15));
}
function keyInput(text, key) {
    if (key === 'AC')
        return '0';
    if (key === '⌫')
        return text.slice(0, -1) || '0';
    if (/^[+\-×÷]$/.test(key))
        return /[+\-×÷]$/.test(text) ? text.slice(0, -1) + key : text + key;
    if (!/^[0-9.]$/.test(key) || text.length >= 160)
        return text;
    const tail = text.split(/[+\-×÷]/).pop() || '';
    if (key === '.' && tail.includes('.'))
        return text;
    if (tail.replace('.', '').length >= 15)
        return text;
    if (key === '.')
        return text + (tail ? '' : '0') + '.';
    return text === '0' ? key : text + key;
}
exports.PERIODS = [{ label: '24时', days: 1, intraday: true }, { label: '7天', days: 7, intraday: true }, { label: '1月', days: 30 }, { label: '6月', days: 183 }, { label: '1年', days: 365 }, { label: '3年', days: 1095 }];
function historyRange(end, days) { if (!validDate(end) || !exports.PERIODS.some(p => p.days === days && !p.intraday))
    throw new Error('历史周期无效'); const d = new Date(end + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - days + 1); return { from: d.toISOString().slice(0, 10), to: end }; }
function parseHistory(data, base, quote, from, to) {
    if (!Array.isArray(data) || !data.length)
        throw new Error('这个周期没有历史数据');
    const seen = new Set();
    const records = data.map(r => {
        if (!r || r.base !== base || r.quote !== quote || !validDate(r.date) || r.date > to || !Number.isFinite(r.rate) || r.rate <= 0 || seen.has(r.date))
            throw new Error('历史数据格式异常');
        seen.add(r.date);
        return { date: r.date, base, quote, rate: r.rate };
        // v2 在周期起点为休市日时会携带此前最后一次报价；保留日期真实含义，过滤区间外点。
    }).filter(r => r.date >= from).sort((a, b) => a.date.localeCompare(b.date));
    if (!records.length)
        throw new Error('这个周期没有历史数据');
    return records;
}
function statistics(records) { if (!records.length)
    throw new Error('没有历史数据'); const values = records.map(r => r.rate); return { high: Math.max(...values), low: Math.min(...values), average: values.reduce((a, b) => a + b, 0) / values.length, change: (values[values.length - 1] / values[0] - 1) * 100 }; }
// 缓存必须重新校验；网络/HTTP/解析失败时仅返回真实缓存，并显式标记离线。
async function cached(store, key, load, validate) {
    try {
        const value = validate(await load());
        const saved = store.set(key, value);
        return { value, offline: false, warning: saved ? '' : '缓存保存失败，下次离线可能不可用' };
    }
    catch (e) {
        try {
            return { value: validate(store.get(key)), offline: true, warning: `连接失败，使用缓存：${e instanceof Error ? e.message : '未知错误'}` };
        }
        catch {
            throw new Error(`无法取得数据且没有可用缓存：${e instanceof Error ? e.message : '未知错误'}`);
        }
    }
}
exports.VERSION = '1.3.0';
function parseYahoo(data) {
    const r = data?.chart?.result?.[0];
    const ts = r?.timestamp, close = r?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(ts) || !Array.isArray(close) || ts.length !== close.length)
        throw new Error('日内行情数据格式异常');
    const out = [];
    ts.forEach((t, i) => { const v = close[i]; if (Number.isFinite(t) && typeof v === 'number' && Number.isFinite(v) && v > 0)
        out.push({ t: t * 1000, v }); });
    if (out.length < 2)
        throw new Error('日内行情数据不足');
    return out.sort((a, b) => a.t - b.t);
}
// base/quote 均为“1 美元兑该币种”的序列（null 代表 USD=1）；返回 1 base 兑 quote，并截取最后 hours 小时。
function crossIntraday(base, quote, a, b, hours) {
    const A = a || [], B = b || [];
    const times = [...new Set([...A.map(p => p.t), ...B.map(p => p.t)])].sort((x, y) => x - y);
    let i = 0, j = 0, va = a ? 0 : 1, vb = b ? 0 : 1;
    const all = [];
    for (const t of times) {
        while (i < A.length && A[i].t <= t)
            va = A[i++].v;
        while (j < B.length && B[j].t <= t)
            vb = B[j++].v;
        if (va > 0 && vb > 0)
            all.push({ date: new Date(t).toISOString(), base, quote, rate: vb / va });
    }
    if (all.length < 2)
        throw new Error('日内行情数据不足');
    const end = Date.parse(all[all.length - 1].date), from = end - hours * 3600000;
    const cut = all.filter(r => Date.parse(r.date) >= from);
    if (cut.length < 2)
        throw new Error('日内行情数据不足');
    return cut;
}
function validateIntraday(value, base, quote) {
    if (!Array.isArray(value) || value.length < 2)
        throw new Error('日内缓存损坏');
    return value.map(r => { if (!r || r.base !== base || r.quote !== quote || !Number.isFinite(Date.parse(r.date)) || !Number.isFinite(r.rate) || r.rate <= 0)
        throw new Error('日内缓存损坏'); return { date: r.date, base, quote, rate: r.rate }; });
}
exports.SOURCES = [
    { key: 'ecb', name: 'Frankfurter · 欧洲央行 ECB', description: '欧洲央行参考汇率，工作日更新', url: 'https://api.frankfurter.dev/v2/rates?providers=ECB&base=EUR', cache: 'rates.ecb.v2' },
    { key: 'boc', name: 'Frankfurter · 加拿大央行 BOC', description: '加拿大央行指示汇率，工作日更新；交叉换算', url: 'https://api.frankfurter.dev/v2/rates?providers=BOC&base=EUR', cache: 'rates.boc.v1' },
    { key: 'er', name: 'ExchangeRate-API', description: '开放参考汇率，每日更新', url: 'https://open.er-api.com/v6/latest/EUR', cache: 'rates.er.v1' },
    { key: 'fawaz-cdn', name: '开源汇率 · jsDelivr', description: 'fawazahmed0 每日数据，CDN 日期可能滞后', url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json', cache: 'rates.fawaz-cdn.v1' },
    { key: 'fawaz-pages', name: '开源汇率 · Cloudflare', description: 'fawazahmed0 每日数据', url: 'https://latest.currency-api.pages.dev/v1/currencies/eur.json', cache: 'rates.fawaz-pages.v1' },
    { key: 'float', name: 'FloatRates', description: '综合参考汇率，约每12小时更新', url: 'https://www.floatrates.com/daily/eur.json', cache: 'rates.float.v1' },
    { key: 'safe', name: '国家外汇管理局 · 人民币中间价', description: 'SAFE官方转发中国外汇交易中心数据；工作日中间价，100单位直接/间接标价，非买卖价', url: 'https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do', cache: 'rates.safe.v1' },
    { key: 'fed', name: '美联储 · H.10', description: '美联储官方周报中的每日纽约午间买入参考价；周一发布上周数据，以USD交叉换算，非用户成交报价', url: 'https://www.federalreserve.gov/releases/h10/current/', cache: 'rates.fed.v1' },
    { key: 'inforeuro', name: '欧盟委员会 · InforEuro', description: '欧盟委员会官方月度会计汇率；日期为适用月份首日，不是当天市场报价', url: 'https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates', cache: 'rates.inforeuro.v1' },
    { key: 'cbr', name: '俄罗斯央行 · CBR', description: '俄罗斯央行官方每日汇率；日期为官方生效日，按Nominal折算卢布，央行不承诺按此买卖', url: 'https://www.cbr.ru/scripts/XML_daily.asp', cache: 'rates.cbr.v1' }
];
function normalizeSettings(value) {
    const v = value;
    if (!v || typeof v.symbols !== 'boolean' || typeof v.showSource !== 'boolean' || !exports.SOURCES.some(s => s.key === v.source) || ![1, 10, 100, 1000, 10000].includes(v.defaultAmount) || !Number.isInteger(v.decimals) || v.decimals < 0 || v.decimals > 8)
        return { symbols: true, showSource: true, source: 'ecb', defaultAmount: 100, decimals: 2 };
    return { symbols: v.symbols, showSource: v.showSource, source: v.source, defaultAmount: v.defaultAmount, decimals: v.decimals };
}
function parseSource(key, data) {
    if (!exports.SOURCES.some(s => s.key === key))
        throw new Error('未知汇率源');
    if (key === 'safe')
        return parseSAFE(data);
    if (key === 'fed')
        return parseFED(data);
    if (key === 'cbr')
        return parseCBR(data);
    if (key === 'inforeuro')
        return parseInforEuro(data);
    const d = data;
    if (key === 'ecb' || key === 'boc') {
        if (!Array.isArray(d))
            throw new Error('汇率数据格式异常');
        return parseLatest(d.filter((r) => exports.CURRENCIES.some(c => c.code === r?.quote)));
    }
    let date = '', raw = {};
    if (key === 'er') {
        if (d?.result !== 'success' || d.base_code !== 'EUR' || !Number.isFinite(d.time_last_update_unix))
            throw new Error('开放汇率数据格式异常');
        date = new Date(d.time_last_update_unix * 1000).toISOString().slice(0, 10);
        raw = d.rates;
    }
    else if (key.startsWith('fawaz-')) {
        date = d?.date;
        raw = d?.eur;
    }
    else {
        if (!d || typeof d !== 'object' || Array.isArray(d))
            throw new Error('FloatRates 数据格式异常');
        raw = { EUR: 1 };
        for (const c of exports.CURRENCIES.filter(c => c.code !== 'EUR')) {
            const r = d[c.code.toLowerCase()];
            if (!r)
                continue;
            const t = Date.parse(r.date);
            if (r.code !== c.code || !Number.isFinite(t))
                throw new Error('FloatRates 数据格式异常');
            const rd = new Date(t).toISOString().slice(0, 10);
            if (date && date !== rd)
                throw new Error('汇率日期不一致');
            date = rd;
            raw[c.code] = typeof r.rate === 'string' && r.rate.trim() ? Number(r.rate) : r.rate;
        }
    }
    if (!raw || typeof raw !== 'object')
        throw new Error('汇率数据格式异常');
    const rates = {};
    for (const c of exports.CURRENCIES) {
        const v = raw[c.code] ?? raw[c.code.toLowerCase()];
        if (v !== undefined) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0)
                throw new Error('汇率数据格式异常');
            rates[c.code] = v;
        }
    }
    return validateSnapshot({ date, rates });
}
// 官方结构化页面/XML解析：不执行远程脚本，不依赖宿主DOM，不用请求日伪造报价日。
function sourceText(data) { if (typeof data !== 'string' || !data.trim())
    throw new Error('官方数据格式异常'); return data.replace(/<!--[\s\S]*?-->/g, ''); }
function cellText(s) { return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim(); }
function positive(s) { if (!/^\d+(?:[.,]\d+)?$/.test(s))
    throw new Error('官方汇率数值异常'); const n = Number(s.replace(',', '.')); if (!Number.isFinite(n) || n <= 0)
    throw new Error('官方汇率数值异常'); return n; }
function rows(table) { return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => cellText(c[1]))); }
// 输入是每1 pivot可兑换的外币数量。EUR归一后每1EUR可兑换该币数量。
function pivotSnapshot(date, pivot, perPivot) {
    const eur = perPivot.EUR;
    if (!eur || perPivot[pivot] !== 1)
        throw new Error('官方数据缺少欧元或基准币');
    const rates = {};
    for (const c of exports.CURRENCIES) {
        const n = perPivot[c.code];
        if (n !== undefined) {
            if (!Number.isFinite(n) || n <= 0)
                throw new Error('官方汇率数值异常');
            rates[c.code] = c.code === 'EUR' ? 1 : n / eur;
        }
    }
    return validateSnapshot({ date, rates });
}
function parseSAFE(data) {
    const text = sourceText(data), table = text.match(/<table\b[^>]*\bid=["']InfoTable["'][^>]*>[\s\S]*?<\/table>/i)?.[0];
    if (!table)
        throw new Error('SAFE官方表格结构变化');
    const all = rows(table), headers = all[0];
    if (!headers || headers[0] !== '日期')
        throw new Error('SAFE官方表头异常');
    const codes = { '美元': 'USD', '欧元': 'EUR', '日元': 'JPY', '港元': 'HKD', '英镑': 'GBP', '澳元': 'AUD', '新西兰元': 'NZD', '新加坡元': 'SGD', '瑞士法郎': 'CHF', '加元': 'CAD', '澳门元': 'MOP', '林吉特': 'MYR', '卢布': 'RUB', '兰特': 'ZAR', '韩元': 'KRW', '迪拉姆': 'AED', '里亚尔': 'SAR', '福林': 'HUF', '兹罗提': 'PLN', '丹麦克朗': 'DKK', '瑞典克朗': 'SEK', '挪威克朗': 'NOK', '里拉': 'TRY', '比索': 'MXN', '泰铢': 'THB' };
    const indirect = new Set(['MOP', 'MYR', 'RUB', 'ZAR', 'KRW', 'AED', 'SAR', 'HUF', 'PLN', 'DKK', 'SEK', 'NOK', 'TRY', 'MXN', 'THB']);
    const quotes = headers.slice(1).map(h => codes[h]);
    if (quotes.some(c => !c) || new Set(quotes).size !== quotes.length)
        throw new Error('SAFE币种表头变化');
    const records = all.slice(1).filter(r => r.length);
    if (records.some(r => !validDate(r[0]) || r.length !== headers.length))
        throw new Error('SAFE官方日期或数据异常');
    records.sort((a, b) => b[0].localeCompare(a[0]));
    const r = records[0];
    if (!r || r.length !== headers.length)
        throw new Error('SAFE官方日期或数据异常');
    const perCNY = { CNY: 1 };
    quotes.forEach((c, i) => { const v = r[i + 1]; if (v === '-' || v === '—' || v === '')
        return; const n = positive(v); perCNY[c] = indirect.has(c) ? n / 100 : 100 / n; });
    return pivotSnapshot(r[0], 'CNY', perCNY);
}
function parseCBR(data) {
    const text = sourceText(data), date = text.match(/<ValCurs\b[^>]*\bDate=["'](\d{2})\.(\d{2})\.(\d{4})["']/)?.slice(1);
    if (!date || !/<\/ValCurs>\s*$/.test(text))
        throw new Error('CBR官方日期或XML异常');
    const perRUB = { RUB: 1 }, seen = new Set();
    for (const m of text.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)) {
        const field = (name) => m[1].match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1].trim();
        const c = field('CharCode');
        if (!c || !/^([A-Z]{3})$/.test(c) || seen.has(c) || c === 'RUB')
            throw new Error('CBR币种异常');
        seen.add(c);
        const nominal = positive(field('Nominal') || ''), value = positive(field('Value') || '');
        if (!Number.isInteger(nominal))
            throw new Error('CBR报价单位异常');
        perRUB[c] = nominal / value;
    }
    return pivotSnapshot(`${date[2]}-${date[1]}-${date[0]}`, 'RUB', perRUB);
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function parseFED(data) {
    const text = sourceText(data), release = text.match(/Release Date:\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
    if (!release || !text.includes('Rates in currency units per U.S. dollar except as noted by an asterisk') || !text.includes('U.S. dollars per currency unit'))
        throw new Error('H.10官方日期或报价单位变化');
    const rm = MONTH_NAMES.indexOf(release[1]) + 1, rd = `${release[3]}-${String(rm).padStart(2, '0')}-${release[2].padStart(2, '0')}`;
    if (!validDate(rd))
        throw new Error('H.10发布日期异常');
    const table = text.match(/<table\b[^>]*class=["']statistics["'][^>]*>[\s\S]*?<\/table>/i)?.[0];
    if (!table)
        throw new Error('H.10官方表格结构变化');
    const all = rows(table), header = all[0];
    if (!header || header[0] !== 'COUNTRY' || header[1] !== 'CURRENCY' || header.length < 3)
        throw new Error('H.10表头异常');
    const countries = { 'AUSTRALIA': 'AUD', 'BRAZIL': 'BRL', 'CANADA': 'CAD', 'CHINA, P.R.': 'CNY', 'DENMARK': 'DKK', 'EMU MEMBERS': 'EUR', 'HONG KONG': 'HKD', 'INDIA': 'INR', 'JAPAN': 'JPY', 'MALAYSIA': 'MYR', 'MEXICO': 'MXN', 'NEW ZEALAND': 'NZD', 'NORWAY': 'NOK', 'SINGAPORE': 'SGD', 'SOUTH AFRICA': 'ZAR', 'SOUTH KOREA': 'KRW', 'SWEDEN': 'SEK', 'SWITZERLAND': 'CHF', 'THAILAND': 'THB', 'UNITED KINGDOM': 'GBP' };
    const seen = new Set(), fx = all.slice(1).filter(r => countries[r[0]?.replace(/^\*\s*/, '')]);
    for (const r of fx) {
        const c = countries[r[0].replace(/^\*\s*/, '')];
        if (seen.has(c) || r.length !== header.length)
            throw new Error('H.10币种或列异常');
        seen.add(c);
    }
    // 周报假期ND不倒填其他日期；选择最近一个默认六币同日齐备的观测列。
    for (let col = header.length - 1; col >= 2; col--) {
        const h = header[col].match(/^([A-Za-z]+)\.?\s+(\d{1,2})$/), month = h ? MONTH_NAMES.findIndex(m => m === h[1] || m.slice(0, 3) === h[1]) + 1 : 0;
        if (!h || !month)
            throw new Error('H.10观测日期异常');
        let year = Number(release[3]);
        if (month > rm)
            year--;
        const date = `${year}-${String(month).padStart(2, '0')}-${h[2].padStart(2, '0')}`;
        if (!validDate(date) || date > rd || Date.parse(rd) - Date.parse(date) > 14 * 86400000)
            throw new Error('H.10观测日期异常');
        const perUSD = { USD: 1 };
        for (const r of fx) {
            const c = countries[r[0].replace(/^\*\s*/, '')], v = r[col];
            if (v === 'ND')
                continue;
            const n = positive(v);
            perUSD[c] = r[0].startsWith('*') ? 1 / n : n;
        }
        if (exports.DEFAULT_CODES.every(c => perUSD[c]))
            return pivotSnapshot(date, 'USD', perUSD);
    }
    throw new Error('缺少默认币种汇率（H.10同日数据）');
}
// 官方API以year/month确定适用期，响应无逐日报价日期。首日仅代表会计月份，非抓取日。
function inforEuroRequest(now = new Date()) {
    const year = now.getUTCFullYear(), month = now.getUTCMonth() + 1;
    return { url: `${exports.SOURCES.find(s => s.key === 'inforeuro').url}?year=${year}&month=${month}`, year, month };
}
function parseInforEuro(data) {
    const d = data;
    if (!d || !Number.isInteger(d.year) || d.year < 1994 || d.year > 9999 || !Number.isInteger(d.month) || d.month < 1 || d.month > 12 || !Array.isArray(d.rates) || !d.rates.length)
        throw new Error('InforEuro适用月份或官方数据异常');
    const rates = {}, seen = new Set();
    for (const r of d.rates) {
        if (!r || !/^([A-Z]{3})$/.test(r.isoA3Code) || seen.has(r.isoA3Code) || typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value <= 0)
            throw new Error('InforEuro官方汇率异常');
        seen.add(r.isoA3Code);
        if (exports.CURRENCIES.some(c => c.code === r.isoA3Code))
            rates[r.isoA3Code] = r.value;
    }
    return validateSnapshot({ date: `${d.year}-${String(d.month).padStart(2, '0')}-01`, rates });
}

return exports; })();
