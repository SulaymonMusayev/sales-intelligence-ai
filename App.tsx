import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, CalendarDays,
  Check, ChevronDown, CircleHelp, Download, LayoutDashboard, LoaderCircle,
  Package, RefreshCw, Search, Settings2, Sparkles, Wallet, ShoppingCart,
  Users, AlertTriangle, Menu, X
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
type AnyRecord = Record<string, any>
type Dashboard = { meta: AnyRecord; kpis: AnyRecord; charts: AnyRecord; transactions: AnyRecord[]; anomaly_count: number }
const money = (n: number) => new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const compactMoney = (n: number) => `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)}`
const number = (n: number) => new Intl.NumberFormat('en-US').format(n || 0)
const colors = ['#5B7CFA', '#36B8A0', '#F5B84B', '#9B83F5', '#F28A76']

function createFallback(): Dashboard {
  const products = [
    { product: 'Wireless Headphones', revenue: 24890, profit: 10800, orders: 324 },
    { product: 'Smart Watch', revenue: 21920, profit: 9700, orders: 170 },
    { product: 'Coffee Maker', revenue: 15340, profit: 6100, orders: 176 },
    { product: 'Running Shoes', revenue: 14200, profit: 6300, orders: 149 },
    { product: 'Backpack', revenue: 8700, profit: 3700, orders: 147 },
  ]
  const today = new Date()
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 13 + i)
    return { date: d.toISOString().slice(0, 10), revenue: 1800 + ((i * 431) % 1800) + (i % 4) * 240, profit: 550 + ((i * 137) % 780), orders: 24 + (i * 7) % 28 }
  })
  const transactions = Array.from({ length: 25 }, (_, i) => {
    const p = products[i % products.length]
    const d = new Date(today); d.setDate(today.getDate() - i % 14)
    return { id: `ORD-${String(2400 + i)}`, date: d.toISOString().slice(0,10), product: p.product, category: ['Electronics','Home','Fashion'][i%3], channel: ['Website','Mobile App','Marketplace'][i%3], region: ['Tashkent','Samarkand','Bukhara'][i%3], quantity: i % 5 + 1, revenue: 80 + (i * 47) % 440, profit: 20 + (i * 17) % 180, customer: `Customer ${1001+i}`, anomaly: i === 8 || i === 19 }
  })
  return {
    meta: { synthetic: true, period: 'month', start_date: daily[0].date, end_date: daily[daily.length-1].date, generated_at: new Date().toISOString() },
    kpis: { revenue: 128450, profit: 46280, orders: 1842, average_order_value: 69.74, profit_margin: 36, growth: 12.8 },
    charts: {
      daily, products,
      channels: [{ channel:'Website', revenue:52400, orders:710 },{ channel:'Mobile App', revenue:38900, orders:580 },{ channel:'Marketplace', revenue:25150, orders:390 },{ channel:'Retail', revenue:12000, orders:162 }],
      categories: [{category:'Electronics',revenue:46800,profit:17800},{category:'Home',revenue:31400,profit:10800},{category:'Fashion',revenue:29300,profit:11200},{category:'Lifestyle',revenue:20950,profit:6480}],
      regions: [{region:'Tashkent',revenue:62400,orders:810},{region:'Samarkand',revenue:26100,orders:370},{region:'Bukhara',revenue:18900,orders:290},{region:'Fergana',revenue:13050,orders:220},{region:'Andijan',revenue:8000,orders:152}]
    }, transactions, anomaly_count: 2
  }
}

const navItems = [
  { label:'Overview', icon:LayoutDashboard },
  { label:'Products', icon:Package },
  { label:'AI Insights', icon:Sparkles },
  { label:'Transactions', icon:ShoppingCart },
]

function KpiCard({ title, value, change, icon: Icon, tone, suffix }: {title:string;value:string;change?:string;icon:any;tone:string;suffix?:string}) {
  return <div className="panel p-5 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-slate-500">{title}</span>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19}/></span>
    </div>
    <div className="mt-4 flex items-end justify-between gap-2">
      <div className="kpi-value text-[clamp(1.45rem,2.3vw,1.9rem)] font-extrabold text-slate-900">{value}</div>
      {change && <span className={`mb-1 flex items-center gap-1 whitespace-nowrap text-xs font-bold ${change.startsWith('-') ? 'text-rose-600':'text-emerald-600'}`}>{change.startsWith('-') ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {change.replace('-','')}</span>}
    </div>
    <div className="mt-2 text-xs text-slate-400">{suffix || 'vs. previous period'}</div>
  </div>
}

function App() {
  const [data, setData] = useState<Dashboard>(() => {
    try { const saved = localStorage.getItem('sales-intelligence-last-dashboard'); if (saved) return JSON.parse(saved) } catch {}
    return createFallback()
  })
  const [period, setPeriod] = useState('month')
  const [analysisType, setAnalysisType] = useState('overview')
  const [page, setPage] = useState('Overview')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('Demo data is synthetic')
  const [search, setSearch] = useState('')
  const [transactionFilter, setTransactionFilter] = useState('all')
  const [insights, setInsights] = useState<AnyRecord | null>(null)
  const [mobileNav, setMobileNav] = useState(false)

  const loadDashboard = useCallback(async (newSeed = false) => {
    setBusy(true)
    try {
      const response = await fetch(`${API}/api/dashboard`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ period, analysis_type:analysisType, ...(newSeed ? {seed: Math.floor(Math.random()*1_000_000)} : {}) })
      })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const result = await response.json()
      setData(result); localStorage.setItem('sales-intelligence-last-dashboard', JSON.stringify(result))
      setNotice('Live backend · synthetic demo data')
      setInsights(null)
    } catch {
      if (newSeed) {
        const next = createFallback()
        next.meta.generated_at = new Date().toISOString()
        next.meta.seed = Math.floor(Math.random()*1_000_000)
        setData(next); localStorage.setItem('sales-intelligence-last-dashboard', JSON.stringify(next))
      }
      setNotice('Showing saved demo data · backend unavailable')
    } finally { setBusy(false) }
  }, [period, analysisType])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const loadInsights = async () => {
    setBusy(true)
    try {
      const response = await fetch(`${API}/api/insights`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) })
      if (!response.ok) throw new Error('Insight request failed')
      setInsights(await response.json())
    } catch {
      setInsights({
        summary:`Tanlangan davrda ${money(data.kpis.revenue)} daromad qayd etildi. Bu raqamlar sun’iy demo ma’lumotlar asosida hisoblangan.`,
        positives:[`Foyda marjasi ${data.kpis.profit_margin}% ni tashkil etdi.`,`Buyurtmalar soni ${number(data.kpis.orders)} ta.`],
        risks:[`${data.anomaly_count} ta noodatiy tranzaksiya belgilangan. Ular alohida tekshirilishi kerak.`],
        recommendations:['Eng ko‘p daromad keltiruvchi mahsulotlar zaxirasini kuzating.','Chegirmalar foyda marjasiga qanday ta’sir qilayotganini tekshiring.','Noodatiy tranzaksiyalarni miqdor va foyda bo‘yicha ko‘rib chiqing.'],
        source:'fallback', synthetic_data:true
      })
    } finally { setBusy(false) }
  }

  const filteredTransactions = useMemo(() => (data.transactions || []).filter((t:AnyRecord) => {
    const matchesSearch = [t.id,t.product,t.customer,t.region,t.channel].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
    const matchesFilter = transactionFilter === 'all' || (transactionFilter === 'anomaly' ? t.anomaly : !t.anomaly)
    return matchesSearch && matchesFilter
  }), [data.transactions, search, transactionFilter])

  const exportCsv = () => {
    const rows = filteredTransactions
    if (!rows.length) return
    const headers = ['id','date','product','category','channel','region','quantity','revenue','profit','customer','anomaly']
    const csv = [headers.join(','), ...rows.map((row:AnyRecord) => headers.map(k => `"${String(row[k] ?? '').replaceAll('"','""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}))
    const a = document.createElement('a'); a.href = url; a.download = 'sales-transactions-demo.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const isOverview = page === 'Overview'
  const isProducts = page === 'Products'
  const isAI = page === 'AI Insights'
  const isTransactions = page === 'Transactions'

  return <div className="app-shell flex">
    <aside className={`${mobileNav ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} sidebar shrink-0 flex-col px-4 py-6 md:flex`}>
      <div className="mb-10 flex items-center gap-3 px-2">
        <span className="brand-mark"><Activity size={20}/></span>
        <div className="brand-copy"><div className="font-extrabold tracking-tight text-white">Sales Intelligence</div><div className="mt-0.5 text-[10px] uppercase tracking-[.2em] text-slate-400">AI ANALYTICS</div></div>
        <button className="ml-auto md:hidden" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={18}/></button>
      </div>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Workspace</div>
      <nav className="space-y-1">{navItems.map(item => <button key={item.label} onClick={()=>{setPage(item.label);setMobileNav(false)}} className={`nav-item ${page===item.label?'active':''}`}><item.icon size={18}/><span className="nav-label text-sm font-medium">{item.label}</span>{item.label==='AI Insights' && <span className="ml-auto rounded-md bg-indigo-400/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-200">AI</span>}</button>)}</nav>
      <div className="mt-8 mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Manage</div>
      <button className="nav-item" onClick={()=>setNotice('Settings will be added in a future version.')}><Settings2 size={18}/><span className="nav-label text-sm">Settings</span></button>
      <div className="sidebar-bottom mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400"/>{'Demo workspace'}</div>
        <p className="mb-0 mt-2 text-[11px] leading-5 text-slate-400">All data is synthetic and created for product demonstration.</p>
      </div>
    </aside>

    <main className="main-content min-w-0 flex-1 p-8">
      <header className="header-row mb-8 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button className="mt-1 rounded-lg border border-slate-200 p-2 md:hidden" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={18}/></button>
          <div><div className="mb-1 text-xs font-semibold text-slate-400">Workspace <span className="mx-1">/</span> <span className="text-slate-600">{page}</span></div><h1 className="mb-1 font-['Manrope'] text-2xl font-extrabold tracking-tight text-slate-900">{isOverview?'Sales overview':page}</h1><p className="mb-0 text-sm text-slate-500">Understand your business performance at a glance.</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"/> Synthetic demo data</span>
          <button onClick={()=>setNotice('Notifications are all caught up.')} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50" aria-label="Notifications"><Bell size={18}/></button>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">SA</div>
        </div>
      </header>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="filter-row flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"><CalendarDays size={16} className="text-slate-400"/><select value={period} onChange={e=>setPeriod(e.target.value)} className="max-w-[145px] border-0 bg-transparent pr-1 text-sm font-semibold outline-none"><option value="week">Last 7 days</option><option value="month">Last 30 days</option><option value="quarter">Last 90 days</option></select><ChevronDown size={14}/></div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"><Settings2 size={16} className="text-slate-400"/><select value={analysisType} onChange={e=>setAnalysisType(e.target.value)} className="max-w-[150px] border-0 bg-transparent text-sm font-semibold outline-none"><option value="overview">Overall sales</option><option value="products">Products</option><option value="profitability">Profitability</option><option value="anomalies">Anomalies</option><option value="customers">Customer behavior</option></select></div>
        </div>
        <button onClick={()=>void loadDashboard(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60">{busy?<LoaderCircle size={16} className="animate-spin"/>:<RefreshCw size={16}/>} Generate new data</button>
      </section>

      <div className="mb-5 flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500"/>{notice}<span className="mx-1">·</span>{data.meta?.start_date} — {data.meta?.end_date}</div>

      {(isOverview || isProducts) && <>
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard title="Total revenue" value={money(data.kpis.revenue)} change={`${data.kpis.growth}%`} icon={Wallet} tone="bg-indigo-50 text-indigo-600" />
          <KpiCard title="Net profit" value={money(data.kpis.profit)} change={`${data.kpis.profit_margin}% margin`} icon={BarChart3} tone="bg-emerald-50 text-emerald-600" suffix="Profit margin"/>
          <KpiCard title="Orders" value={number(data.kpis.orders)} change="+8.4%" icon={ShoppingCart} tone="bg-amber-50 text-amber-600"/>
          <KpiCard title="Average order value" value={money(data.kpis.average_order_value)} icon={Activity} tone="bg-sky-50 text-sky-600" suffix="Revenue per order"/>
          <KpiCard title="Profit margin" value={`${data.kpis.profit_margin}%`} icon={BarChart3} tone="bg-violet-50 text-violet-600" suffix="Profit / revenue"/>
          <KpiCard title="Potential anomalies" value={number(data.anomaly_count)} icon={AlertTriangle} tone="bg-rose-50 text-rose-600" suffix="Flagged for review"/>
        </section>

        {isOverview && <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className="panel p-5">
            <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="mb-1 text-base font-bold text-slate-800">Revenue performance</h2><p className="mb-0 text-xs text-slate-400">Revenue and profit over time</p></div><span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500">USD</span></div>
            <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.charts.daily} margin={{top:8,right:4,left:0,bottom:0}}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5B7CFA" stopOpacity={0.2}/><stop offset="95%" stopColor="#5B7CFA" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef1f7" vertical={false}/><XAxis dataKey="date" tickFormatter={v=>String(v).slice(5)} tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#9aa4b6'}} minTickGap={25}/><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#9aa4b6'}} width={48}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #e8edf5',fontSize:12}} formatter={(v:any,n:any)=>[money(Number(v)),n==='revenue'?'Revenue':'Profit']}/><Area type="monotone" dataKey="revenue" stroke="#5B7CFA" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{r:5}}/><Area type="monotone" dataKey="profit" stroke="#36B8A0" strokeWidth={2} fill="transparent" activeDot={{r:4}}/></AreaChart></ResponsiveContainer></div>
            <div className="mt-2 flex gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-indigo-500"/>Revenue</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500"/>Profit</span></div>
          </div>
          <div className="panel p-5">
            <div className="mb-4"><h2 className="mb-1 text-base font-bold text-slate-800">Sales channels</h2><p className="mb-0 text-xs text-slate-400">Revenue by acquisition channel</p></div>
            <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.charts.channels} dataKey="revenue" nameKey="channel" innerRadius={57} outerRadius={83} paddingAngle={4} stroke="none">{data.charts.channels.map((_:any,i:number)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={(v:any)=>money(Number(v))}/></PieChart></ResponsiveContainer></div>
            <div className="space-y-3">{data.charts.channels.map((c:AnyRecord,i:number)=><div key={c.channel} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-full" style={{background:colors[i%colors.length]}}/>{c.channel}</span><span className="font-bold text-slate-700">{money(c.revenue)}</span></div>)}</div>
          </div>
        </section>}

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="panel p-5"><div className="mb-5"><h2 className="mb-1 text-base font-bold text-slate-800">Top products</h2><p className="mb-0 text-xs text-slate-400">Products ranked by revenue</p></div><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.charts.products.slice(0,6)} layout="vertical" margin={{left:8,right:12,top:0,bottom:0}}><CartesianGrid stroke="#eef1f7" horizontal={false}/><XAxis type="number" tickFormatter={compactMoney} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#9aa4b6'}}/><YAxis type="category" dataKey="product" width={130} axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#64748b'}}/><Tooltip formatter={(v:any)=>money(Number(v))}/><Bar dataKey="revenue" fill="#5B7CFA" radius={[0,6,6,0]} barSize={19}/></BarChart></ResponsiveContainer></div></div>
          <div className="panel p-5"><div className="mb-5"><h2 className="mb-1 text-base font-bold text-slate-800">Revenue by category</h2><p className="mb-0 text-xs text-slate-400">Compare category performance</p></div><div className="space-y-5 pt-2">{data.charts.categories.map((c:AnyRecord,i:number)=>{const max=Math.max(...data.charts.categories.map((x:AnyRecord)=>x.revenue),1);return <div key={c.category}><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">{c.category}</span><span className="font-bold text-slate-800">{money(c.revenue)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{width:`${c.revenue/max*100}%`,background:colors[i%colors.length]}}/></div></div>})}</div></div>
        </section>
      </>}

      {isAI && <section className="panel p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles size={24}/></span><div><h2 className="mb-1 text-lg font-bold">AI Business Analyst</h2><p className="mb-0 text-sm text-slate-500">Get an explanation of your sales performance and actionable recommendations.</p></div></div><div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-900">Analysis uses synthetic demo data. AI explanations are advisory and should not be treated as verified business facts.</div><button onClick={()=>void loadInsights()} disabled={busy} className="mb-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{busy?<LoaderCircle size={16} className="animate-spin"/>:<Sparkles size={16}/>} Generate AI analysis</button>{insights && <div className="space-y-5"><div><h3 className="mb-2 font-bold">Summary</h3><p className="text-sm leading-7 text-slate-600">{insights.summary}</p></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800"><Check size={16}/> Positive signals</h3><ul className="space-y-2 text-sm leading-6 text-slate-600">{insights.positives?.map((x:string,i:number)=><li key={i}>• {x}</li>)}</ul></div><div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800"><AlertTriangle size={16}/> Risks to review</h3><ul className="space-y-2 text-sm leading-6 text-slate-600">{insights.risks?.map((x:string,i:number)=><li key={i}>• {x}</li>)}</ul></div></div><div><h3 className="mb-3 font-bold">Recommended actions</h3><div className="space-y-2">{insights.recommendations?.map((x:string,i:number)=><div key={i} className="flex gap-3 rounded-xl border border-slate-100 p-3 text-sm text-slate-600"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{i+1}</span>{x}</div>)}</div></div><p className="mb-0 text-xs text-slate-400">Analysis source: {insights.source==='gemini'?'Gemini AI':'fallback analysis'} · synthetic demo data</p></div>}</section>}

      {isTransactions && <section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="mb-1 font-bold">Transactions</h2><p className="mb-0 text-xs text-slate-400">{filteredTransactions.length} demo records</p></div><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14}/> Export CSV</button></div><div className="flex flex-wrap gap-3 p-4"><div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search size={15} className="text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders, products..." className="w-full text-sm outline-none"/></div><select value={transactionFilter} onChange={e=>setTransactionFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><option value="all">All transactions</option><option value="anomaly">Potential anomalies</option><option value="normal">Normal transactions</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Order','Date','Product','Channel','Region','Revenue','Profit','Status'].map(h=><th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredTransactions.map((t:AnyRecord)=><tr key={t.id} className="hover:bg-slate-50/70"><td className="px-5 py-3 font-semibold text-indigo-600">{t.id}</td><td className="px-5 py-3 text-slate-500">{t.date}</td><td className="px-5 py-3 font-medium text-slate-700">{t.product}</td><td className="px-5 py-3 text-slate-500">{t.channel}</td><td className="px-5 py-3 text-slate-500">{t.region}</td><td className="px-5 py-3 font-semibold">{money(t.revenue)}</td><td className="px-5 py-3 text-emerald-700">{money(t.profit)}</td><td className="px-5 py-3">{t.anomaly?<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Review</span>:<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Normal</span>}</td></tr>)}</tbody></table></div></section>}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-[11px] text-slate-400"><span>© 2026 Sales Intelligence AI · Demo product</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400"/> Synthetic data only · Not real business records</span></footer>
    </main>
  </div>
}

export default App
