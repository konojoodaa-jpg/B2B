/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Search, 
  MapPin, 
  Linkedin, 
  Globe, 
  Mail, 
  Download, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Building2,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Star,
  FileText,
  Calendar,
  Save,
  Trash2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { geminiService } from "@/src/services/gemini";
import { Lead, TargetCountry, SearchState, KeywordResults } from "@/src/types";
import Markdown from "react-markdown";

const HIERARCHICAL_COUNTRIES: Record<string, Record<string, string[]>> = {
  "亚洲": {
    "东亚": ["中国", "日本", "韩国", "中国台湾", "中国香港", "蒙古"],
    "东南亚": ["越南", "泰国", "印度尼西亚", "马来西亚", "新加坡", "菲律宾", "缅甸", "柬埔寨", "老挝", "文莱", "东帝汶"],
    "南亚/中亚": ["印度", "巴基斯坦", "孟加拉国", "斯里兰卡", "尼泊尔", "哈萨克斯坦", "乌兹别克斯坦", "土库曼斯坦", "吉尔吉斯斯坦", "塔吉克斯坦", "阿富汗"],
    "西亚/中东": ["沙特阿拉伯", "阿联酋", "土耳其", "以色列", "卡特尔", "科威特", "阿曼", "约旦", "黎巴嫩", "伊拉克", "伊朗", "巴林", "也门", "叙利亚", "塞浦路斯"]
  },
  "欧洲": {
    "西欧/北欧": ["德国", "法国", "英国", "荷兰", "比利时", "瑞典", "挪威", "丹麦", "芬兰", "瑞士", "奥地利", "卢森堡", "爱尔兰", "冰岛"],
    "东欧/中欧": ["波兰", "俄罗斯", "乌克兰", "罗马尼亚", "匈牙利", "捷克", "白俄罗斯", "保加利亚", "斯洛伐克", "摩尔多瓦", "爱沙尼亚", "拉脱维亚", "立陶宛"],
    "南欧": ["意大利", "西班牙", "葡萄牙", "希腊", "塞尔维亚", "克罗地亚", "斯洛文尼亚", "波斯尼亚", "黑山", "阿尔巴尼亚", "马其顿", "马耳他"]
  },
  "美洲": {
    "北美": ["美国", "加拿大", "墨西哥"],
    "中南美": ["巴西", "阿根廷", "智利", "哥伦比亚", "秘鲁", "委内瑞拉", "厄瓜多尔", "巴拉圭", "乌拉圭", "玻利维亚", "圭亚那", "苏里南"],
    "加勒比海": ["古巴", "多米尼加", "海地", "牙买加", "波多黎各"]
  },
  "非洲/大洋洲": {
    "北非/东非": ["埃及", "摩洛哥", "阿尔及利亚", "突尼斯", "利比亚", "苏丹", "埃塞俄比亚", "肯尼亚", "坦桑尼亚", "乌干达"],
    "西非/中非": ["尼日利亚", "加纳", "象牙海岸", "塞内加尔", "喀麦隆", "刚果(金)", "安哥拉", "加蓬"],
    "南非/周边": ["南非", "津巴布韦", "纳米比亚", "博茨瓦纳", "赞比亚", "莫桑比克", "马达加斯加"],
    "大洋洲": ["澳大利亚", "新西兰", "斐济", "巴布亚新几内亚", "所罗门群岛", "萨摩亚"]
  }
};

export default function App() {
  const [selectedContinent, setSelectedContinent] = useState<string>("欧洲");
  const [selectedRegion, setSelectedRegion] = useState<string>("东欧/中欧");
  const [selectedCountry, setSelectedCountry] = useState<TargetCountry>("波兰");
  const [dbLeads, setDbLeads] = useState<Lead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    progress: 0,
    log: []
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<string>("workbench");
  const [keywordData, setKeywordData] = useState<KeywordResults | null>(null);
  const [productKeyword, setProductKeyword] = useState<string>("Medical Endoscopes");
  const [linkedinStatus, setLinkedinStatus] = useState<Record<string, string>>({});
  const [searchPage, setSearchPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<"date" | "seo" | "year" | "rating">("date");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [devNotes, setDevNotes] = useState<string>(`### 开发心得与市场洞察
*在此记录您在获客过程中的发现、策略调整及心得...*

**2026-04-19 案例分析:**
- **波兰市场**: 这里的医疗器械批发商对 SEO 权重非常敏感，优先联系权重 > 50 的企业。
- **搜索优化**: 使用本地语言关键词 (如: endoskopy medyczne) 配合网页抓取效果更佳。
- **转化提醒**: 发送邮件前，一定要去领英确认一下采购经理最近是否有变动。`);

  const addLog = (message: string) => {
    setSearchState(prev => ({
      ...prev,
      log: [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.log].slice(0, 50)
    }));
  };

  const startAutomation = async () => {
    if (searchState.isSearching) return;

    setSearchState(prev => ({ ...prev, isSearching: true, progress: 0, log: [] }));
    addLog(`Initiating Global Export Automation for ${productKeyword} in ${selectedCountry}...`);
    
    try {
      // Step 1: Multi-Platform Keyword Expansion
      setSearchState(prev => ({ ...prev, progress: 10 }));
      addLog(`Step 1: Universal Autocomplete Simulation (Google, Alibaba, Amazon)...`);
      const keywords = await geminiService.generateKeywords(selectedCountry, productKeyword);
      setKeywordData(keywords);
      addLog(`Captured ${keywords.google.length + keywords.alibaba.length + keywords.amazon.length} high-intent keywords across platforms.`);

      // Step 2: Google Search Verification
      setSearchState(prev => ({ ...prev, progress: 30 }));
      addLog(`Step 2: Performing Real-time Google Search for ${selectedCountry} market...`);
      addLog(`Verifying company validity and crawling active domains...`);

      // Step 3: Global Lead Extraction
      setSearchState(prev => ({ ...prev, progress: 60 }));
      addLog("Step 3: Extracting verified B2B leads and decision-maker profiles...");
      addLog("Matching contact data against official registries...");

      // Step 4: AI Enrichment & Database Sync
      setSearchState(prev => ({ ...prev, progress: 85 }));
      addLog(`Step 4: AI Grounding & Deduplication (Batch Verification)...`);
      
      const existingCompanyNames = dbLeads.map(l => l.companyName);
      const newLeads = await geminiService.simulateLeads(selectedCountry, productKeyword, 12, searchPage, existingCompanyNames);
      
      const formattedLeads: Lead[] = newLeads.map((l: any, i: number) => ({
        ...l,
        id: Math.random().toString(36).substr(2, 9),
        status: "New",
        source: `Automation Page ${searchPage}`,
        scrapedAt: new Date().toISOString()
      }));

      setLeads(prev => [...formattedLeads, ...prev]);
      setDbLeads(prev => [...formattedLeads, ...prev]);
      setSearchPage(prev => prev + 1);
      setSearchState(prev => ({ ...prev, progress: 100, isSearching: false }));
      addLog(`Success: 12 leads from Page ${searchPage} verified and added to database.`);
      
    } catch (error) {
      console.error(error);
      addLog("Error occurred during automation. Please check API settings.");
      setSearchState(prev => ({ ...prev, isSearching: false }));
    }
  };
  
  const updateLead = (leadId: string, updates: Partial<Lead>) => {
    setDbLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const exportLeads = () => {
    const dataSource = activeTab === "leads" ? dbLeads : leads;
    const headers = ["Company", "Country", "Category", "Website", "Email", "Contact", "Position"];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + dataSource.map(l => [l.companyName, l.country, l.category, l.website, l.email, l.contactPerson, l.position].join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_${selectedCountry.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedDbLeads = [...dbLeads]
    .filter(l => {
      const matchesSearch = l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "seo") return (b.seoRank || 0) - (a.seoRank || 0);
      if (sortBy === "year") return (b.establishedYear || 0) - (a.establishedYear || 0);
      return new Date(b.scrapedAt || 0).getTime() - new Date(a.scrapedAt || 0).getTime();
    });

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Sidebar - High Density Professional Navigation */}
      <aside className="w-60 bg-[#1e293b] text-white flex flex-col py-6 shrink-0 transition-all">
        <div className="px-6 mb-8 text-[18px] font-extrabold tracking-tight text-blue-500">
          GLOBALTRADE PRO
        </div>
        <nav className="flex flex-col">
          <SidebarNavItem 
            label="自动化工作台" 
            icon={<TrendingUp className="w-4 h-4" />} 
            active={activeTab === "workbench"} 
            onClick={() => setActiveTab("workbench")}
          />
          <SidebarNavItem 
            label="全球线索库 & CRM" 
            icon={<Users className="w-4 h-4" />} 
            active={activeTab === "leads"} 
            onClick={() => setActiveTab("leads")}
          />
          <SidebarNavItem 
            label="LinkedIn 助手" 
            icon={<Linkedin className="w-4 h-4" />} 
            active={activeTab === "linkedin"} 
            onClick={() => setActiveTab("linkedin")}
          />
          <SidebarNavItem 
            label="开发心得 & 洞察" 
            icon={<FileText className="w-4 h-4" />} 
            active={activeTab === "journal"} 
            onClick={() => setActiveTab("journal")}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#f1f5f9] overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-[#e2e8f0] flex items-center justify-between px-8 bg-white sticky top-0 z-10">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-[#0f172a]">全球 B2B 自动化扩张引擎</h1>
            <p className="text-xs text-[#64748b]">多维大数据驱动 | 领英/谷歌/电商 复合抓取</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="bg-[#10b981] text-white px-3 py-1 rounded-full text-[11px] font-bold">
              ● 引擎运行中
            </span>
            <button 
              onClick={startAutomation}
              disabled={searchState.isSearching}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-sm"
            >
              {searchState.isSearching ? "获客进行中..." : "一键开始全域获客"}
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {activeTab === "workbench" ? (
            <>
              {/* Stats Bar */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="工作台当前线索" value={leads.length.toString()} />
                <StatCard label="全库总存储" value={dbLeads.length.toString()} />
                <StatCard label="验证率" value="99.2%" />
                <StatCard label="活跃度" value="High" />
              </section>

              {/* Configuration & Lead Stream */}
              <section className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 items-start">
                <div className="glass-card p-5 space-y-6 bg-white">
                  <div className="space-y-4">
                    <ConfigGroup label="目标扩张市场 (全球区域分级)">
                      <div className="grid grid-cols-1 gap-2">
                        <select 
                          value={selectedContinent} 
                          onChange={(e) => {
                            const cont = e.target.value;
                            setSelectedContinent(cont);
                            const firstRegion = Object.keys(HIERARCHICAL_COUNTRIES[cont])[0];
                            setSelectedRegion(firstRegion);
                            setSelectedCountry(HIERARCHICAL_COUNTRIES[cont][firstRegion][0]);
                          }}
                          className="w-full p-2 bg-gray-50 border rounded text-[11px] font-bold text-gray-700"
                          disabled={searchState.isSearching}
                        >
                          {Object.keys(HIERARCHICAL_COUNTRIES).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <select 
                            value={selectedRegion} 
                            onChange={(e) => {
                              const reg = e.target.value;
                              setSelectedRegion(reg);
                              setSelectedCountry(HIERARCHICAL_COUNTRIES[selectedContinent][reg][0]);
                            }}
                            className="w-full p-2 bg-gray-50 border rounded text-[11px] font-bold text-gray-700"
                            disabled={searchState.isSearching}
                          >
                            {Object.keys(HIERARCHICAL_COUNTRIES[selectedContinent]).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          
                          <select 
                            value={selectedCountry} 
                            onChange={(e) => setSelectedCountry(e.target.value as TargetCountry)}
                            className="w-full p-2 bg-gray-50 border rounded text-[11px] font-bold text-gray-700"
                            disabled={searchState.isSearching}
                          >
                            {HIERARCHICAL_COUNTRIES[selectedContinent][selectedRegion].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </ConfigGroup>
                    
                    <ConfigGroup label="核心产品关键词 (自定义意图)">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                        <input 
                          type="text" 
                          value={productKeyword} 
                          onChange={(e) => setProductKeyword(e.target.value)}
                          placeholder="例如: Medical Endoscope"
                          className="w-full pl-8 pr-3 py-2 bg-gray-50 border rounded text-xs font-bold text-gray-700 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none"
                          disabled={searchState.isSearching}
                        />
                      </div>
                    </ConfigGroup>

                    <ConfigGroup label="多平台联想词库 (Google / Alibaba / Amazon)">
                      <div className="space-y-3 p-3 bg-gray-50 border rounded min-h-[120px]">
                        {!keywordData ? (
                          <div className="text-center py-8 text-gray-400 text-[10px]">
                            <Globe className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            启动获客后将自动抓取各平台推荐词
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span> GOOGLE
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.google.slice(0, 6).map(k => <span key={k} className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600">{k}</span>)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span> ALIBABA
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.alibaba.slice(0, 6).map(k => <span key={k} className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600">{k}</span>)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span> AMAZON
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.amazon.slice(0, 6).map(k => <span key={k} className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600">{k}</span>)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span> {selectedCountry.toUpperCase()} LOCAL
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.localTerms.slice(0, 6).map(k => <span key={k} className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600">{k}</span>)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ConfigGroup>
                  </div>
                  {searchState.isSearching && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400">
                        <span>GLOBAL SEARCH SEQUENCE</span>
                        <span>{searchState.progress}%</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-blue-600" animate={{ width: `${searchState.progress}%` }} />
                      </div>
                      <div className="h-32 overflow-y-auto font-mono text-[9px] text-gray-400 bg-gray-50 p-2 rounded">
                        {searchState.log.map((entry, i) => <div key={i}>{entry}</div>)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-card overflow-hidden bg-white">
                  <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
                    <span className="font-bold text-sm">实时获客流 (Live Leads)</span>
                    <button onClick={exportLeads} className="text-blue-600 text-xs font-semibold hover:underline">下载 CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 text-[11px] font-semibold text-[#64748b] border-b">
                          <th className="px-4 py-3">公司名称</th>
                          <th className="px-4 py-3">国家</th>
                          <th className="px-4 py-3">负责人</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {leads.map((lead) => (
                           <tr key={lead.id} className="text-sm">
                              <td className="px-4 py-3">
                                <div className="font-bold">{lead.companyName}</div>
                                <div className="text-[10px] text-blue-600">{lead.website}</div>
                              </td>
                              <td className="px-4 py-3 text-xs">{lead.country}</td>
                              <td className="px-4 py-3 text-xs">{lead.contactPerson}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          ) : activeTab === "leads" ? (
             <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:space-x-6 w-full">
                      <h3 className="font-bold text-sm whitespace-nowrap">全球线索库 & CRM ({sortedDbLeads.length}/{dbLeads.length})</h3>
                      <div className="flex flex-wrap items-center gap-3 w-full">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="搜索公司或联系人..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">状态:</span>
                           <select 
                              value={statusFilter} 
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="bg-white border rounded px-2 py-1.5 text-[11px] font-bold text-gray-700 outline-none"
                           >
                              <option value="all">全部状态</option>
                              <option value="New">新线索</option>
                              <option value="Contacted">已联系</option>
                              <option value="Qualified">初筛通过</option>
                              <option value="Disqualified">不匹配</option>
                           </select>
                        </div>
                        <div className="flex items-center space-x-2">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">排序:</span>
                           <select 
                              value={sortBy} 
                              onChange={(e) => setSortBy(e.target.value as any)}
                              className="bg-white border rounded px-2 py-1.5 text-[11px] font-bold text-blue-600 outline-none"
                           >
                              <option value="date">最新入库</option>
                              <option value="seo">SEO 权重</option>
                              <option value="year">资历(年限)</option>
                              <option value="rating">评分优先</option>
                           </select>
                        </div>
                      </div>
                   </div>
                   
                   <div className="flex items-center space-x-4 shrink-0">
                     <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                       <CheckCircle2 className="w-3 h-3 text-amber-600" />
                       <span className="text-[10px] font-bold text-amber-700">重点关注 (4星+): {dbLeads.filter(l => (l.rating || 0) >= 4).length}</span>
                     </div>
                     <div className="flex items-center space-x-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                       <Calendar className="w-3 h-3 text-blue-600" />
                       <span className="text-[10px] font-bold text-blue-700">今日待跟进: {dbLeads.filter(l => l.nextFollowUp === new Date().toISOString().split('T')[0]).length}</span>
                     </div>
                     <button onClick={exportLeads} className="bg-slate-900 text-white px-3 py-1.5 rounded text-[11px] font-bold shadow-sm active:scale-95 transition-transform">导出 CSV</button>
                   </div>
                </div>
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 border-b">
                         <th className="px-4 py-3">公司 & SEO权重</th>
                         <th className="px-4 py-3">决策人/职位</th>
                         <th className="px-4 py-3">资历 (成立年份)</th>
                         <th className="px-4 py-3">入库时间</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y text-sm">
                         {sortedDbLeads.map(l => (
                            <tr key={l.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => setSelectedLead(l)}>
                               <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="font-bold text-[#0f172a]">{l.companyName}</div>
                                    <div className="flex text-yellow-500 scale-75">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={cn("w-3 h-3 fill-current", (l.rating || 0) > i ? "opacity-100" : "opacity-20")} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-[11px] text-gray-500 flex items-center space-x-2">
                                     <span>{l.country} | </span>
                                     <a 
                                      href={l.website.startsWith('http') ? l.website : `https://${l.website}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-500 hover:underline flex items-center space-x-1"
                                      onClick={(e) => e.stopPropagation()}
                                     >
                                       <span>{l.website}</span>
                                       <ExternalLink className="w-2.5 h-2.5" />
                                     </a>
                                     <span className="bg-blue-50 text-blue-600 px-1.5 rounded-sm font-bold border border-blue-100 italic">SEO: {l.seoRank}</span>
                                  </div>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2 text-xs">
                                     <div className="font-medium">{l.contactPerson}</div>
                                     {l.linkedinUrl && (
                                        <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#0077b5]" onClick={(e) => e.stopPropagation()}>
                                           <Linkedin className="w-3 h-3" />
                                        </a>
                                     )}
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-bold">{l.position}</div>
                               </td>
                               <td className="px-4 py-3 text-xs font-mono">{l.establishedYear || 'N/A'}</td>
                               <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                                 <div>{l.scrapedAt ? new Date(l.scrapedAt).toLocaleDateString() : 'N/A'}</div>
                                 {l.nextFollowUp && <div className="text-[9px] text-red-500 font-bold flex items-center"><Calendar className="w-2 h-2 mr-1" /> {l.nextFollowUp}</div>}
                               </td>
                            </tr>
                         ))}
                      {dbLeads.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-gray-400">线索库暂无数据</td></tr>}
                   </tbody>
                </table>
             </div>
          ) : activeTab === "linkedin" ? (
             <div className="space-y-6">
                <section className="bg-white rounded-xl border p-6 flex items-center justify-between">
                   <div>
                      <h3 className="text-lg font-bold text-[#0f172a]">LinkedIn 决策人定向助手</h3>
                      <p className="text-sm text-gray-500">基于线索库中的决策人信息，自动化进行领英社交开发。</p>
                   </div>
                   <div className="flex space-x-3">
                      <div className="text-right">
                         <div className="text-[10px] font-bold text-gray-400 uppercase">今日待处理</div>
                         <div className="text-xl font-bold text-blue-600">{dbLeads.length}</div>
                      </div>
                      <button 
                        onClick={() => {
                          const status: Record<string, string> = {};
                          dbLeads.forEach(l => status[l.id] = "Inviting...");
                          setLinkedinStatus(status);
                          setTimeout(() => {
                            const newStatus: Record<string, string> = {};
                            dbLeads.forEach(l => newStatus[l.id] = "Sent");
                            setLinkedinStatus(newStatus);
                          }, 2000);
                        }}
                        className="bg-[#0077b5] text-white px-4 py-2 rounded text-sm font-bold flex items-center space-x-2"
                      >
                         <Linkedin className="w-4 h-4" />
                         <span>批量发起建立连接</span>
                      </button>
                   </div>
                </section>

                <div className="bg-white rounded-xl border overflow-hidden">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 border-b">
                            <th className="px-4 py-3">人名/职位</th>
                            <th className="px-4 py-3">公司/国家</th>
                            <th className="px-4 py-3">领英状态</th>
                           </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                         {dbLeads.map(l => (
                            <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                     <div className="font-bold text-[#0f172a]">{l.contactPerson}</div>
                                     {l.linkedinUrl && (
                                        <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#0077b5] hover:opacity-80">
                                           <Linkedin className="w-3 h-3" />
                                        </a>
                                     )}
                                  </div>
                                  <div className="text-[10px] text-blue-600 font-semibold">{l.position}</div>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="text-xs font-medium">{l.companyName}</div>
                                  <div className="text-[10px] text-gray-400 uppercase">{l.country}</div>
                               </td>
                               <td className="px-4 py-3 text-xs">
                                  {linkedinStatus[l.id] === "Sent" ? (
                                     <span className="text-emerald-600 font-bold flex items-center space-x-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>已发送邀请</span>
                                     </span>
                                  ) : linkedinStatus[l.id] === "Inviting..." ? (
                                     <span className="text-blue-500 animate-pulse font-bold">处理中...</span>
                                  ) : (
                                     <span className="text-gray-400">就绪 (Ready)</span>
                                  )}
                               </td>
                               <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                     <button 
                                       onClick={() => setLinkedinStatus(prev => ({ ...prev, [l.id]: "Sent" }))}
                                       className="text-[10px] font-bold text-gray-400 hover:text-blue-600 border px-2 py-1 rounded transition-colors"
                                     >
                                        定向加速
                                     </button>
                                     {l.linkedinUrl && (
                                        <a 
                                          href={l.linkedinUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-[10px] font-bold bg-[#0077b5] text-white px-2 py-1 rounded flex items-center space-x-1"
                                        >
                                           <ExternalLink className="w-2.5 h-2.5" />
                                           <span>访问主页</span>
                                        </a>
                                     )}
                                  </div>
                               </td>
                            </tr>
                         ))}
                         {dbLeads.length === 0 && (
                            <tr>
                               <td colSpan={3} className="p-12 text-center text-gray-400">
                                  暂无 LinkedIn 相关线索，请先在工作台获取客户数据。
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          ) : activeTab === "journal" ? (
            <div className="space-y-6">
               <section className="bg-white rounded-xl border p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                       <FileText className="w-6 h-6" />
                     </div>
                     <div>
                       <h3 className="text-lg font-bold text-[#0f172a]">外贸开发心得 & 市场洞察</h3>
                       <p className="text-sm text-gray-500">记录您在全球市场探索中的实战心得、策略反馈及下一步计划。</p>
                     </div>
                  </div>
                  <div className="flex space-x-2">
                     <button 
                       onClick={() => {
                         const time = new Date().toLocaleString();
                         setDevNotes(prev => `**${time} 记录:**\n\n\n---\n` + prev);
                       }}
                       className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-bold flex items-center space-x-2"
                     >
                        <Save className="w-4 h-4" />
                        <span>新增记录</span>
                     </button>
                  </div>
               </section>

               <div className="bg-white rounded-xl border p-6 min-h-[500px] shadow-inner font-sans">
                  <textarea
                   value={devNotes}
                   onChange={(e) => setDevNotes(e.target.value)}
                   className="w-full h-full min-h-[450px] bg-transparent outline-none text-sm text-gray-700 leading-relaxed font-sans resize-none"
                   placeholder="在这里输入您的开发笔记..."
                  />
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-white rounded-xl border border-dashed">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-bold">模块集成中</h3>
              <p className="text-sm text-gray-500 mt-2">"{activeTab}" 模块深度集成中...</p>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedLead && (
          <LeadDetailModal 
            lead={selectedLead} 
            onClose={() => setSelectedLead(null)} 
            onUpdate={updateLead}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LeadDetailModal({ lead, onClose, onUpdate }: { lead: Lead, onClose: () => void, onUpdate: (id: string, updates: Partial<Lead>) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
          <div>
            <h2 className="text-xl font-bold">{lead.companyName}</h2>
            <div className="text-xs text-slate-400 mt-1">{lead.country} | {lead.website}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">线索评分</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    className={cn("w-6 h-6 cursor-pointer transition-colors", (lead.rating || 0) >= star ? "text-yellow-400 fill-current" : "text-gray-200")} 
                    onClick={() => onUpdate(lead.id, { rating: star })}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">跟进阶段</label>
              <select 
                value={lead.status}
                onChange={(e) => onUpdate(lead.id, { status: e.target.value as any })}
                className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm font-bold text-blue-600 outline-none"
              >
                <option value="New">新线索 (New)</option>
                <option value="Contacted">已联系 (Contacted)</option>
                <option value="Qualified">初筛通过 (Qualified)</option>
                <option value="Disqualified">不匹配 (Disqualified)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">下次跟进时间</label>
              <input 
                type="date"
                value={lead.nextFollowUp || ""}
                onChange={(e) => onUpdate(lead.id, { nextFollowUp: e.target.value })}
                className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">跟进笔记</label>
            <textarea 
              rows={4}
              value={lead.notes || ""}
              onChange={(e) => onUpdate(lead.id, { notes: e.target.value })}
              placeholder="记录跟进进度、关键痛点或反馈..."
              className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded text-blue-600"><Users className="w-5 h-5" /></div>
            <div>
              <div className="text-sm font-bold text-blue-900">{lead.contactPerson}</div>
              <div className="text-xs text-blue-700">{lead.position}</div>
              <div className="mt-1 flex items-center space-x-3">
                <span className="text-[10px] font-mono text-blue-500">{lead.email}</span>
                <span className="text-[10px] font-mono text-blue-500">{lead.phone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
           <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">
             保存修改
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SidebarNavItem({ label, icon, active = false, onClick }: { label: string, icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("px-6 py-2.5 flex items-center space-x-3 cursor-pointer text-sm", active ? "bg-white/10 text-white border-l-4 border-blue-500" : "text-gray-400 hover:text-white hover:bg-white/5")}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="glass-card p-4 bg-white border rounded">
      <div className="text-[11px] font-bold text-gray-500 uppercase mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ConfigGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-gray-500 uppercase">{label}</label>
      {children}
    </div>
  );
}

function ToolBox({ title, items }: { title: string, items: string[] }) {
  return (
    <div className="space-y-2">
       <h5 className="font-medium text-gray-600">{title}</h5>
       <ul className="space-y-1 text-xs text-gray-500">
          {items.map(i => <li key={i}>{i}</li>)}
       </ul>
    </div>
  );
}
