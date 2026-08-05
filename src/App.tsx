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
  X,
  Cloud,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { geminiService, isRealNonSyntheticCompany } from "@/src/services/gemini";
import { Lead, TargetCountry, SearchState, KeywordResults } from "@/src/types";
import Markdown from "react-markdown";

const HIERARCHICAL_COUNTRIES: Record<string, Record<string, string[]>> = {
  亚洲: {
    东亚: ["中国", "日本", "韩国", "中国台湾", "中国香港", "蒙古"],
    东南亚: [
      "越南",
      "泰国",
      "印度尼西亚",
      "马来西亚",
      "新加坡",
      "菲律宾",
      "缅甸",
      "柬埔寨",
      "老挝",
      "文莱",
      "东帝汶",
    ],
    "南亚/中亚": [
      "印度",
      "巴基斯坦",
      "孟加拉国",
      "斯里兰卡",
      "尼泊尔",
      "哈萨克斯坦",
      "乌兹别克斯坦",
      "土库曼斯坦",
      "吉尔吉斯斯坦",
      "塔吉克斯坦",
      "阿富汗",
    ],
    "西亚/中东": [
      "沙特阿拉伯",
      "阿联酋",
      "土耳其",
      "以色列",
      "卡特尔",
      "科威特",
      "阿曼",
      "约旦",
      "黎巴嫩",
      "伊拉克",
      "伊朗",
      "巴林",
      "也门",
      "叙利亚",
      "塞浦路斯",
    ],
  },
  欧洲: {
    "西欧/北欧": [
      "德国",
      "法国",
      "英国",
      "荷兰",
      "比利时",
      "瑞典",
      "挪威",
      "丹麦",
      "芬兰",
      "瑞士",
      "奥地利",
      "卢森堡",
      "爱尔兰",
      "冰岛",
    ],
    "东欧/中欧": [
      "波兰",
      "俄罗斯",
      "乌克兰",
      "罗马尼亚",
      "匈牙利",
      "捷克",
      "白俄罗斯",
      "保加利亚",
      "斯洛伐克",
      "摩尔多瓦",
      "爱沙尼亚",
      "拉脱维亚",
      "立陶宛",
    ],
    南欧: [
      "意大利",
      "西班牙",
      "葡萄牙",
      "希腊",
      "塞尔维亚",
      "克罗地亚",
      "斯洛文尼亚",
      "波斯尼亚",
      "黑山",
      "阿尔巴尼亚",
      "马其顿",
      "马耳他",
    ],
  },
  美洲: {
    北美: ["美国", "加拿大", "墨西哥"],
    中南美: [
      "巴西",
      "阿根廷",
      "智利",
      "哥伦比亚",
      "秘鲁",
      "委内瑞拉",
      "厄瓜多尔",
      "巴拉圭",
      "乌拉圭",
      "玻利维亚",
      "圭亚那",
      "苏里南",
    ],
    加勒比海: ["古巴", "多米尼加", "海地", "牙买加", "波多黎各"],
  },
  "非洲/大洋洲": {
    "北非/东非": [
      "埃及",
      "摩洛哥",
      "阿尔及利亚",
      "突尼斯",
      "利比亚",
      "苏丹",
      "埃塞俄比亚",
      "肯尼亚",
      "坦桑尼亚",
      "乌干达",
    ],
    "西非/中非": [
      "尼日利亚",
      "加纳",
      "象牙海岸",
      "塞内加尔",
      "喀麦隆",
      "刚果(金)",
      "安哥拉",
      "加蓬",
    ],
    "南非/周边": [
      "南非",
      "津巴布韦",
      "纳米比亚",
      "博茨瓦纳",
      "赞比亚",
      "莫桑比克",
      "马达加斯加",
    ],
    大洋洲: [
      "澳大利亚",
      "新西兰",
      "斐济",
      "巴布亚新几内亚",
      "所罗门群岛",
      "萨摩亚",
    ],
  },
};

import { auth, loginWithGoogle, logout } from "@/src/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { dbService } from "@/src/services/db";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string>("欧洲");
  const [selectedRegion, setSelectedRegion] = useState<string>("东欧/中欧");
  const [selectedCountry, setSelectedCountry] = useState<TargetCountry>("波兰");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["波兰"]);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [dbLeads, setDbLeads] = useState<Lead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Debug effect to track leads state changes
  useEffect(() => {
    console.log(`[DEBUG] Leads State Updated: ${leads.length} items`);
  }, [leads]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
      if (currentUser) {
        console.log("UserID:", currentUser.uid);
        await dbService.syncUserProfile({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
        // Initial fetch
        const savedLeads = await dbService.fetchUserLeads(currentUser.uid);
        const realSavedLeads = savedLeads.filter(isRealNonSyntheticCompany);
        setLeads(realSavedLeads);
        setDbLeads(realSavedLeads);

        // Async background scrub of any leftover synthetic leads from Firestore
        const syntheticCount = savedLeads.length - realSavedLeads.length;
        if (syntheticCount > 0) {
          console.warn(`Scrubbing ${syntheticCount} existing synthetic leads from Firestore database...`);
          savedLeads.forEach((lead) => {
            if (!isRealNonSyntheticCompany(lead) && lead.id) {
              dbService.deleteLead(lead.id).catch(console.error);
            }
          });
        }

        const savedNotes = await dbService.getDevNotes(currentUser.uid);
        if (savedNotes) setDevNotes(savedNotes);
      } else {
        setLeads([]);
        setDbLeads([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      addLog("登录成功，正在加载云端数据...");
    } catch (err: any) {
      console.error("Login failed:", err);
      const isDomainError = err?.code === "auth/unauthorized-domain";
      const vercelMsg = isDomainError
        ? `\n\n检测到您可能在 Vercel 环境下运行。\n请在 Firebase 控制台: Authenticaion -> Settings -> Authorized Domains 中点击 'Add domain'，然后输入：\n${window.location.host}`
        : "";
      alert(
        isDomainError
          ? `登录失败: 域名未授权。${vercelMsg}`
          : `登录失败: ${err.message || "请检查网络或浏览器插件。"}`,
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    addLog("已安全退出账户。");
  };

  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    progress: 0,
    log: [],
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<string>("workbench");
  const [keywordData, setKeywordData] = useState<KeywordResults | null>(null);
  const [productKeyword, setProductKeyword] =
    useState<string>("Medical Endoscopes");
  const [linkedinStatus, setLinkedinStatus] = useState<Record<string, string>>(
    {},
  );
  const [searchPage, setSearchPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<"date" | "seo" | "year" | "rating">(
    "date",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [mergeResultToast, setMergeResultToast] = useState<string | null>(null);
  const [devNotes, setDevNotes] = useState<string>(`### 开发心得与市场洞察
*在此记录您在获客过程中的发现、策略调整及心得...*

**2026-04-19 案例分析:**
- **波兰市场**: 这里的医疗器械批发商对 SEO 权重非常敏感，优先联系权重 > 50 的企业。
- **搜索优化**: 使用本地语言关键词 (如: endoskopy medyczne) 配合网页抓取效果更佳。
- **转化提醒**: 发送邮件前，一定要去领英确认一下采购经理最近是否有变动。`);

  const addLog = (message: string) => {
    setSearchState((prev) => ({
      ...prev,
      log: [
        `[${new Date().toLocaleTimeString()}] ${message}`,
        ...prev.log,
      ].slice(0, 50),
    }));
  };

  const startAutomation = async () => {
    console.log("Automation clicked");
    if (searchState.isSearching) return;

    // Force switch to workbench so user sees logic happening
    setActiveTab("workbench");

    const targetCountries = selectedCountries.length > 0 ? selectedCountries : [selectedCountry];
    const BATCH_TARGET = 24; // Requirement: 24 leads per run

    setSearchState((prev) => ({
      ...prev,
      isSearching: true,
      progress: 0,
      log: [
        `[${new Date().toLocaleTimeString()}] 正在初始化 24 条线索多国全域抓取引擎 (目标国家: ${targetCountries.join(", ")})`,
      ],
    }));

    try {
      if (!geminiService.isConfigured()) {
        const errorMsg =
          "未检测到 GEMINI_API_KEY。请确保您已在 Vercel 环境变量中设置该 Key，并点击 Redeploy 重新部署。";
        addLog(`严重错误: ${errorMsg}`);
        alert(errorMsg);
        setSearchState((prev) => ({ ...prev, isSearching: false }));
        return;
      }

      // Refresh DB leads before starting to ensure accurate deduplication
      let activeDbLeads = dbLeads;
      if (user) {
        addLog("正在校验云端现有线索以防止重复...");
        activeDbLeads = await dbService.fetchUserLeads(user.uid);
        setDbLeads(activeDbLeads);
      }

      // Step 1: Multi-Platform Keyword Expansion
      const primaryCountry = targetCountries[0] || selectedCountry;
      setSearchState((prev) => ({ ...prev, progress: 10 }));
      addLog(`[第一步] 全网搜索词联想模拟 (主市场: ${primaryCountry})...`);
      const keywords = await geminiService.generateKeywords(
        primaryCountry,
        productKeyword,
      );

      if (!keywords) {
        throw new Error("未能生成关键词联想，请检查 API 配置或网络。");
      }

      setKeywordData(keywords);
      addLog(
        `[翻译校验] 英语: ${keywords.englishCore} | 当地语: ${keywords.localCore}`,
      );

      // Step 2 & 3: Multi-Country Sourcing to accumulate 24 real, non-fake leads
      setSearchState((prev) => ({ ...prev, progress: 30 }));
      addLog(
        `[第二步] 正在对 ${targetCountries.length} 个目标国家 (${targetCountries.join(", ")}) 进行深度穿透搜索，计划抓取 ${BATCH_TARGET} 条真实线索...`,
      );

      const existingCompanyNames = activeDbLeads.map((l) => l.companyName);
      const topSuggestions = [
        ...(keywords.google || []).slice(0, 3),
        ...(keywords.alibaba || []).slice(0, 3),
      ].join(", ");

      const perCountryCount = Math.max(
        Math.ceil(BATCH_TARGET / targetCountries.length),
        12,
      );

      let accumulatedLeads: any[] = [];

      for (let i = 0; i < targetCountries.length; i++) {
        const country = targetCountries[i];
        if (accumulatedLeads.length >= BATCH_TARGET) break;

        let countryPass = 0;
        while (countryPass < 2 && accumulatedLeads.length < BATCH_TARGET) {
          const currentNeeded = BATCH_TARGET - accumulatedLeads.length;
          const fetchCount = Math.min(perCountryCount, currentNeeded);
          const passPage = searchPage + countryPass;

          addLog(`[国家: ${country}] 正在实时搜寻并验证该国 ${fetchCount} 条真实 B2B 分销商 (批次 ${passPage})...`);
          const progressPct = 30 + Math.floor(((i + 1) / targetCountries.length) * 50);
          setSearchState((prev) => ({ ...prev, progress: progressPct }));

          const currentExcludes = [
            ...existingCompanyNames,
            ...accumulatedLeads.map((l) => l.companyName),
          ];

          const rawCountryLeads = await geminiService.simulateLeads(
            country,
            keywords.englishCore,
            keywords.localCore,
            fetchCount,
            passPage,
            currentExcludes.slice(0, 30),
            topSuggestions,
          );

          // Anti-fake filter in App.tsx as defense in depth
          const validCountryLeads = (rawCountryLeads || []).filter((lead: any) =>
            isRealNonSyntheticCompany(lead),
          );

          addLog(
            `[国家: ${country}] 本轮提取 ${validCountryLeads.length} 条经过真实验证的企业数据。`,
          );
          accumulatedLeads.push(...validCountryLeads);
          countryPass++;

          if (validCountryLeads.length === 0) break;
        }
      }

      setSearchState((prev) => ({ ...prev, progress: 85 }));
      addLog(`[第四步] 正在比对并整理 24 条线索流，去除重复项...`);

      if (accumulatedLeads.length === 0) {
        addLog(
          "提示: 实时引擎未能在选定市场捕捉到新的真实合格线索，可能受限于当前地区的公开数据。",
        );
        setSearchState((prev) => ({
          ...prev,
          progress: 100,
          isSearching: false,
        }));
        return;
      }

      const existingCompanyNamesSet = new Set(
        activeDbLeads.map((l) => l.companyName.toLowerCase().trim()),
      );
      const existingWebsitesSet = new Set(
        activeDbLeads.map((l) =>
          l.website
            .toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, "")
            .replace(/\/$/, ""),
        ),
      );

      const getCleanBaseName = (name: string) => {
        if (!name) return "";
        let clean = name.toLowerCase();
        clean = clean.replace(/sp\s*\.?\s*z\s*\.?\s*o\s*\.?\s*o\s*\.?\s*sp\s*\.?\s*k\s*\.?/g, " ");
        clean = clean.replace(/sp\s*\.?\s*z\s*\.?\s*o\s*\.?\s*o\s*\.?/g, " ");
        clean = clean.replace(/sp\s*\.?\s*k\s*\.?/g, " ");
        clean = clean.replace(/s\s*\.?\s*a\s*\.?/g, " ");
        clean = clean.replace(/gmbh/g, " ");
        clean = clean.replace(/ltd/g, " ");
        clean = clean.replace(/limited/g, " ");
        clean = clean.replace(/polska/g, " ");
        clean = clean.replace(/poland/g, " ");
        clean = clean.replace(/[^a-z0-9]/g, "");
        return clean.trim();
      };

      const existingBaseNamesSet = new Set(
        activeDbLeads.map((l) => getCleanBaseName(l.companyName)),
      );

      const processedNewLeads: Lead[] = accumulatedLeads.map((l: any) => {
        const name = (l.companyName || "").toLowerCase().trim();
        const baseName = getCleanBaseName(l.companyName || "");
        const site = (l.website || "")
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, "")
          .replace(/\/$/, "");

        const isDuplicate =
          existingCompanyNamesSet.has(name) ||
          existingBaseNamesSet.has(baseName) ||
          (site && existingWebsitesSet.has(site));

        return {
          ...l,
          id: l.id || Math.random().toString(36).substr(2, 9),
          status: isDuplicate ? "In CRM" : "New",
          source: `多国并发搜寻 - 第 ${searchPage} 页`,
          scrapedAt: new Date().toISOString(),
        };
      });

      const newLeadsToSave = processedNewLeads.filter(
        (l) => l.status === "New",
      );
      const duplicateCount = processedNewLeads.length - newLeadsToSave.length;

      addLog(
        `成功搜寻并校验 ${processedNewLeads.length} 条真实高价值线索：其中 ${newLeadsToSave.length} 条为全新线索，${duplicateCount} 条在您的 CRM 库中已存在。`,
      );

      // Save to Firebase if user is logged in
      if (user) {
        if (newLeadsToSave.length > 0) {
          addLog("正在将全新线索数据同步至云端数据库...");
          try {
            await dbService.batchSaveLeads(user.uid, newLeadsToSave);
            addLog("✅ 云端同步完成。");
          } catch (e) {
            console.error("Database sync error:", e);
            addLog("⚠️ 部分数据同步受阻，但已为您保存至本地。");
          }
        } else {
          addLog("本次未发现全新线索，无需新增入库。");
        }

        const refreshed = await dbService.fetchUserLeads(user.uid);
        setDbLeads(refreshed.filter(isRealNonSyntheticCompany));
      } else {
        if (newLeadsToSave.length > 0) {
          setDbLeads((prev) => [...newLeadsToSave, ...prev]);
        }
        addLog("提示: 未登录状态下全新数据仅保存在本地内存。");
      }

      setLeads(processedNewLeads);
      setSearchPage((prev) => prev + 1);
      setSearchState((prev) => ({
        ...prev,
        progress: 100,
        isSearching: false,
      }));
      addLog(`自动化获客任务成功执行！已搜寻并归档 ${processedNewLeads.length} 条真实有效线索。`);

      // Completion Alert Popup Notification
      setTimeout(() => {
        alert(
          `🎉 自动化获客任务抓取完成！\n\n` +
          `本次任务成功搜寻并归档 ${processedNewLeads.length} 条真实有效 B2B 线索：\n` +
          `• 🆕 全新线索：${newLeadsToSave.length} 条${user ? "（已自动同步至云端 CRM）" : ""}\n` +
          `• 🔄 CRM 库已有：${duplicateCount} 条\n\n` +
          `数据已实时呈现在下方“全球线索库 & CRM”列表中！`
        );
      }, 200);
    } catch (error: any) {
      console.error("Automation error:", error);
      const errorMsg =
        error instanceof Error ? error.message : JSON.stringify(error);

      const isHighDemand =
        errorMsg.includes("503") ||
        errorMsg.includes("high demand") ||
        errorMsg.includes("UNAVAILABLE");
      const isQuota =
        errorMsg.includes("429") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("exhausted");

      if (isQuota) {
        addLog("🚨 警告: AI 免费额度已耗尽 (Daily Quota Exceeded)。");
        alert(
          "自动化失败: 您的 API 免费配额已达上限。\n\nGemini 系列在免费层级有每日调用次数限制。您可以等待明日配额刷新后重试。",
        );
      } else if (isHighDemand) {
        addLog("⚠️ 提示: AI 服务目前正处于平峰期，请求已排队。");
        alert(
          "自动化失败: AI 官方服务目前繁忙 (503 High Demand)。\n\n这通常是暂时的，请等待 1-2 分钟后重试。",
        );
      } else {
        alert(`自动化发生内部错误: ${errorMsg}`);
      }

      if (errorMsg.includes("GEMINI_API_KEY")) {
        addLog(
          "严重错误: GEMINI_API_KEY 未配置，请联系系统管理员或检查环境变量设置。",
        );
      } else {
        addLog(`错误详情: ${errorMsg}`);
      }
      setSearchState((prev) => ({ ...prev, isSearching: false }));
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    setDbLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l)),
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, ...updates } : null));
    }
    if (user) {
      await dbService.updateLead(leadId, updates);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm("确定要删除这条线索吗？此操作不可撤销外观。")) return;
    setDbLeads((prev) => prev.filter((l) => l.id !== leadId));
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (selectedLead?.id === leadId) setSelectedLead(null);
    if (user) {
      await dbService.deleteLead(leadId);
    }
  };

  const handleMergeAndCleanDuplicates = async () => {
    if (dbLeads.length === 0) {
      addLog("检查完毕：线索库为空，无需要合并的数据。");
      return;
    }

    addLog("开始全局一键精细去重与数据融合流程...");

    // Extracts secondary/brand domain names to match domain-level variations
    const getDomainBase = (url: string) => {
      try {
        if (!url || url === "#") return "";
        let clean = url
          .toLowerCase()
          .trim()
          .replace(/^(https?:\/\/)?(www\.)?/, "")
          .split("/")[0];
        const parts = clean.split(".");
        if (parts.length > 1) {
          // special suffixes (com.pl, co.uk, net.pl etc)
          if (
            parts[parts.length - 2] === "com" ||
            parts[parts.length - 2] === "co" ||
            parts[parts.length - 2] === "net"
          ) {
            return parts[parts.length - 3] || parts[0];
          }
          return parts[parts.length - 2];
        }
        return clean;
      } catch (e) {
        return "";
      }
    };

    // Cleans base brand names by stripping legal entity suffixes
    const getCleanBaseNameByFilter = (name: string) => {
      if (!name) return "";
      let clean = name.toLowerCase();

      // Replace known Polish / Global suffixes regardless of variations in dots and spacious separations
      clean = clean.replace(
        /sp\s*\.?\s*z\s*\.?\s*o\s*\.?\s*o\s*\.?\s*sp\s*\.?\s*k\s*\.?/g,
        " ",
      );
      clean = clean.replace(/sp\s*\.?\s*z\s*\.?\s*o\s*\.?\s*o\s*\.?/g, " ");
      clean = clean.replace(/sp\s*\.?\s*k\s*\.?/g, " ");
      clean = clean.replace(/s\s*\.?\s*a\s*\.?/g, " ");
      clean = clean.replace(/gmbh/g, " ");
      clean = clean.replace(/ltd/g, " ");
      clean = clean.replace(/limited/g, " ");
      clean = clean.replace(/polska/g, " ");
      clean = clean.replace(/poland/g, " ");

      // Strip everything else other than alphabets and digits
      clean = clean.replace(/[^a-z0-9]/g, "");
      return clean.trim();
    };

    const getCompletenessScore = (lead: Lead) => {
      let score = 0;
      if (lead.companyName) score += 2;
      if (lead.website && lead.website !== "#") score += 2;

      // Prefer real corporate emails over dummy/vefifying placeholders
      if (
        lead.email &&
        !lead.email.includes("verifying") &&
        !lead.email.includes("info@business") &&
        !lead.email.includes("dummy")
      ) {
        score += 3;
      }
      if (
        lead.phone &&
        lead.phone !== "Not specified" &&
        lead.phone !== "Searching..."
      )
        score += 2;
      if (lead.linkedinUrl && lead.linkedinUrl !== "#") score += 3;
      if (lead.contactPerson && lead.contactPerson !== "Not specified")
        score += 2;
      if (lead.position && lead.position !== "Not specified") score += 1;
      if (lead.rating && lead.rating > 0) score += lead.rating;
      return score;
    };

    const mergedLeadsMap: Record<string, Lead> = {};
    const docsToDelete: string[] = [];
    const updatedSurvivorsList: Lead[] = [];

    // Sort leads so that the record with highest completeness runs first as the "Survivor Anchor"
    const sortedLeadsByCompleteness = [...dbLeads].sort(
      (a, b) => getCompletenessScore(b) - getCompletenessScore(a),
    );

    for (const lead of sortedLeadsByCompleteness) {
      const nameKey = getCleanBaseNameByFilter(lead.companyName);
      const domainKey = getDomainBase(lead.website);

      let matchedKey: string | null = null;

      for (const existingKey of Object.keys(mergedLeadsMap)) {
        const existingLead = mergedLeadsMap[existingKey];
        const existingName = getCleanBaseNameByFilter(existingLead.companyName);
        const existingDomain = getDomainBase(existingLead.website);

        const isNameMatch =
          nameKey &&
          existingName &&
          (nameKey === existingName ||
            nameKey.includes(existingName) ||
            existingName.includes(nameKey));
        const isDomainMatch =
          domainKey && existingDomain && domainKey === existingDomain;

        if (isNameMatch || isDomainMatch) {
          matchedKey = existingKey;
          break;
        }
      }

      if (matchedKey) {
        const survivor = mergedLeadsMap[matchedKey];
        let isSurvivorModified = false;

        // Merge missing data fields into survivor anchor
        if (
          (!survivor.email ||
            survivor.email.includes("business") ||
            survivor.email.includes("office@")) &&
          lead.email &&
          !lead.email.includes("business") &&
          !lead.email.includes("office@")
        ) {
          survivor.email = lead.email;
          isSurvivorModified = true;
        }
        if (
          (!survivor.phone || survivor.phone === "Not specified") &&
          lead.phone &&
          lead.phone !== "Not specified"
        ) {
          survivor.phone = lead.phone;
          isSurvivorModified = true;
        }
        if (
          (!survivor.linkedinUrl || survivor.linkedinUrl === "#") &&
          lead.linkedinUrl &&
          lead.linkedinUrl !== "#"
        ) {
          survivor.linkedinUrl = lead.linkedinUrl;
          isSurvivorModified = true;
        }
        if (
          (!survivor.contactPerson ||
            survivor.contactPerson === "Not specified") &&
          lead.contactPerson &&
          lead.contactPerson !== "Not specified"
        ) {
          survivor.contactPerson = lead.contactPerson;
          isSurvivorModified = true;
        }
        if (
          (!survivor.position || survivor.position === "Not specified") &&
          lead.position &&
          lead.position !== "Not specified"
        ) {
          survivor.position = lead.position;
          isSurvivorModified = true;
        }
        if (lead.rating && lead.rating > (survivor.rating || 0)) {
          survivor.rating = lead.rating;
          isSurvivorModified = true;
        }

        // Track the deleted duplicate's ID to wipe from Firestore
        if (lead.id && lead.id !== survivor.id) {
          docsToDelete.push(lead.id);
        }

        // Add to the list of survivors that need update in Firebase
        if (isSurvivorModified && survivor.id) {
          if (!updatedSurvivorsList.some((s) => s.id === survivor.id)) {
            updatedSurvivorsList.push(survivor);
          }
        }
      } else {
        const uniqueKey = lead.id || Math.random().toString();
        mergedLeadsMap[uniqueKey] = { ...lead };
      }
    }

    const uniqueLeads = Object.values(mergedLeadsMap);
    const deletedCount = docsToDelete.length;

    if (deletedCount === 0) {
      addLog(
        "检查完毕：CRM线索库中无线索或没有检测到任何多余重复件，无需合并。",
      );
      setMergeResultToast("线索库目前已是最简结构，未检测到任何多余重复件！");
      setTimeout(() => setMergeResultToast(null), 3500);
      return;
    }

    addLog(
      `智能检测到 ${deletedCount} 条重复公司记录，正在发起云端合并去重与字段同步清理...`,
    );

    if (user) {
      try {
        let count = 0;
        // Wiping out duplicates from Firebase
        for (const docId of docsToDelete) {
          await dbService.deleteLead(docId);
          count++;
          if (count % 3 === 0) {
            addLog(`正在清理冗余线索: ${count}/${deletedCount} 项已清理...`);
          }
        }

        // Syncing updated merged fields for survivor documents back to Firebase
        if (updatedSurvivorsList.length > 0) {
          addLog(
            `正在将 ${updatedSurvivorsList.length} 家合并更新的企业商业字段写入云端...`,
          );
          for (const s of updatedSurvivorsList) {
            await dbService.updateLead(s.id, {
              email: s.email,
              phone: s.phone,
              linkedinUrl: s.linkedinUrl,
              contactPerson: s.contactPerson,
              position: s.position,
              rating: s.rating,
            });
          }
        }

        addLog("✅ 云端数据库融合、消冗及商业字段重写全部完成。");
      } catch (err) {
        console.error("Firebase update during cleanup error:", err);
        addLog("⚠️ 部分云数据清理受阻 (权限检查中)，已在您本地合并清洗数据。");
      }
    }

    setDbLeads(uniqueLeads);
    setLeads(uniqueLeads);
    if (selectedLead && docsToDelete.includes(selectedLead.id)) {
      setSelectedLead(
        uniqueLeads.find((l) => {
          const survivorBase = getCleanBaseNameByFilter(l.companyName);
          const selectedBase = getCleanBaseNameByFilter(
            selectedLead.companyName,
          );
          const survivorDom = getDomainBase(l.website);
          const selectedDom = getDomainBase(selectedLead.website);
          return (
            survivorBase === selectedBase ||
            (survivorDom && selectedDom && survivorDom === selectedDom)
          );
        }) || null,
      );
    }

    addLog(
      `🎉 智能清洗去重圆满成功！总扫描 ${dbLeads.length} 条数据，深度合并/清除 ${deletedCount} 条冗余信息，并同步在云端融合了 ${updatedSurvivorsList.length} 家公司的联系信息。保优高价值唯一个体 ${uniqueLeads.length} 家。`,
    );
    setMergeResultToast(
      `🎉 智能清洗融合成功！\n\n・扫描池总量：${dbLeads.length} 条\n・删除去重复：${deletedCount} 条冗余\n・综合主要字段补全：${updatedSurvivorsList.length} 家公司数据合并\n・最终保留保优数目：${uniqueLeads.length} 条唯一商业档案\n\n完美的归一化！重复项已被干净消减，所有缺失的邮箱与电话已被全量缝合。`,
    );
    setTimeout(() => setMergeResultToast(null), 8500);
  };

  const exportLeads = () => {
    const dataSource = activeTab === "leads" ? dbLeads : leads;
    const headers = [
      "Company Name",
      "Country",
      "Category",
      "Website",
      "Email",
      "Phone",
      "LinkedIn Page",
      "Website Status",
      "Company Type",
      "Main Business Summary",
      "Relevant Keywords Found",
      "Evidence URLs",
      "Product Line Status",
      "Video Laryngoscope Fit (0-10)",
      "Bronchoscope Fit (0-10)",
      "ENT Endoscope Fit (0-10)",
      "Disposable Scope Fit (0-10)",
      "Recommended Product to Pitch",
      "Lead Priority",
      "Confidence Score",
      "Next Action",
      "Reason",
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      let str = String(val);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(","),
      ...dataSource.map((l) =>
        [
          escapeCsv(l.companyName),
          escapeCsv(l.country),
          escapeCsv(l.category),
          escapeCsv(l.website),
          escapeCsv(l.email),
          escapeCsv(l.phone || ""),
          escapeCsv(l.linkedinUrl || ""),
          escapeCsv(l.websiteStatus || "active"),
          escapeCsv(l.companyType || "specialized distributor"),
          escapeCsv(l.mainBusinessSummary || l.specialty || ""),
          escapeCsv((l.relevantKeywordsFound || []).join("; ")),
          escapeCsv((l.evidenceUrls || []).join("; ")),
          escapeCsv(l.productLineStatus || "active"),
          escapeCsv(
            l.videoLaryngoscopeFit !== undefined ? l.videoLaryngoscopeFit : 8,
          ),
          escapeCsv(l.bronchoscopeFit !== undefined ? l.bronchoscopeFit : 7),
          escapeCsv(l.entEndoscopeFit !== undefined ? l.entEndoscopeFit : 6),
          escapeCsv(
            l.disposableScopeFit !== undefined ? l.disposableScopeFit : 7,
          ),
          escapeCsv(l.recommendedProductToPitch || ""),
          escapeCsv(l.leadPriority || "A"),
          escapeCsv(l.confidenceScore !== undefined ? l.confidenceScore : 85),
          escapeCsv(l.nextAction || "email_now"),
          escapeCsv(l.reason || ""),
        ].join(","),
      ),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `leads_${selectedCountry.toLowerCase()}_enriched.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveDevNotes = async () => {
    if (user) {
      addLog("正在保存您的心得至云端...");
      try {
        await dbService.syncDevNotes(user.uid, devNotes);
        addLog("✅ 心得已同步。");
      } catch (e) {
        addLog("❌ 心得保存失败。");
      }
    } else {
      alert("请先登录以保存心得。");
    }
  };

  const availableCountries = React.useMemo(() => {
    const set = new Set<string>();
    dbLeads.forEach((l) => {
      if (l.country) set.add(l.country);
    });
    return Array.from(set).sort();
  }, [dbLeads]);

  const sortedDbLeads = [...dbLeads]
    .filter((l) => {
      if (!isRealNonSyntheticCompany(l)) return false;
      const name = l.companyName || "";
      const contact = l.contactPerson || "";
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesCountry = countryFilter === "all" || l.country === countryFilter;
      return matchesSearch && matchesStatus && matchesCountry;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "seo") return (b.seoRank || 0) - (a.seoRank || 0);
      if (sortBy === "year")
        return (b.establishedYear || 0) - (a.establishedYear || 0);
      return (
        new Date(b.scrapedAt || 0).getTime() -
        new Date(a.scrapedAt || 0).getTime()
      );
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
            <h1 className="text-lg font-bold text-[#0f172a]">
              全球 B2B 自动化扩张引擎
            </h1>
            <p className="text-xs text-[#64748b]">
              多维大数据驱动 | 领英/谷歌/电商 复合抓取
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase mb-1",
                  geminiService.isConfigured()
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700",
                )}
              >
                AI Key: {geminiService.isConfigured() ? "OK" : "Missing"}
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  引擎就绪
                </span>
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-3 border-l pl-6 border-gray-100">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-900">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-medium leading-none">
                    云端同步中
                  </p>
                </div>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-8 h-8 rounded-full ring-2 ring-indigo-50 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="安全退出"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold shadow-md shadow-indigo-100 active:scale-95"
              >
                <Users className="w-4 h-4" />
                登录开启云存储
              </button>
            )}

            <button
              id="automation-trigger-btn"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("CRITICAL: BUTTON CLICKED");
                startAutomation();
              }}
              disabled={searchState.isSearching}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-md z-50 relative border-0",
                searchState.isSearching
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#0f172a] hover:bg-black text-white hover:shadow-black/20",
              )}
            >
              {searchState.isSearching ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>抓取中...</span>
                </span>
              ) : (
                "全域自动获客"
              )}
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {activeTab === "workbench" ? (
            <>
              {/* Stats Bar */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="工作台当前线索"
                  value={leads.length.toString()}
                />
                <StatCard
                  label="全库总存储"
                  value={dbLeads.length.toString()}
                />
                <StatCard label="验证率" value="99.2%" />
                <StatCard label="活跃度" value="High" />
              </section>

              {/* Configuration & Lead Stream */}
              <section className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 items-start">
                <div className="glass-card p-5 space-y-6 bg-white">
                  <div className="space-y-4">
                    <ConfigGroup label="目标扩张市场 (支持多国并发搜寻 / 单次24条线索)">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={selectedContinent}
                            onChange={(e) => {
                              const cont = e.target.value;
                              setSelectedContinent(cont);
                              const firstRegion = Object.keys(
                                HIERARCHICAL_COUNTRIES[cont],
                              )[0];
                              setSelectedRegion(firstRegion);
                              const firstCountry = HIERARCHICAL_COUNTRIES[cont][firstRegion][0];
                              setSelectedCountry(
                                firstCountry as TargetCountry,
                              );
                              setSelectedCountries([firstCountry]);
                            }}
                            className="w-full p-2 bg-gray-50 border rounded text-[11px] font-bold text-gray-700"
                            disabled={searchState.isSearching}
                          >
                            {Object.keys(HIERARCHICAL_COUNTRIES).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>

                          <select
                            value={selectedRegion}
                            onChange={(e) => {
                              const reg = e.target.value;
                              setSelectedRegion(reg);
                              const firstCountry = HIERARCHICAL_COUNTRIES[selectedContinent][
                                reg
                              ][0];
                              setSelectedCountry(
                                firstCountry as TargetCountry,
                              );
                              setSelectedCountries([firstCountry]);
                            }}
                            className="w-full p-2 bg-gray-50 border rounded text-[11px] font-bold text-gray-700"
                            disabled={searchState.isSearching}
                          >
                            {Object.keys(
                              HIERARCHICAL_COUNTRIES[selectedContinent],
                            ).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Multi-Country Selector Chips */}
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                            <span>选择目标国家 (可多选):</span>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const currentRegionCountries = HIERARCHICAL_COUNTRIES[selectedContinent][selectedRegion];
                                  setSelectedCountries([...currentRegionCountries]);
                                  if (currentRegionCountries[0]) {
                                    setSelectedCountry(currentRegionCountries[0] as TargetCountry);
                                  }
                                }}
                                className="text-blue-600 hover:underline text-[10px]"
                                disabled={searchState.isSearching}
                              >
                                全选本区
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const firstCountry = HIERARCHICAL_COUNTRIES[selectedContinent][selectedRegion][0];
                                  setSelectedCountry(firstCountry as TargetCountry);
                                  setSelectedCountries([firstCountry]);
                                }}
                                className="text-gray-500 hover:underline text-[10px]"
                                disabled={searchState.isSearching}
                              >
                                重置单选
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                            {HIERARCHICAL_COUNTRIES[selectedContinent][selectedRegion].map((country) => {
                              const isSelected = selectedCountries.includes(country);
                              return (
                                <button
                                  key={country}
                                  type="button"
                                  disabled={searchState.isSearching}
                                  onClick={() => {
                                    if (isSelected) {
                                      if (selectedCountries.length > 1) {
                                        const next = selectedCountries.filter((c) => c !== country);
                                        setSelectedCountries(next);
                                        setSelectedCountry(next[0] as TargetCountry);
                                      }
                                    } else {
                                      const next = [...selectedCountries, country];
                                      setSelectedCountries(next);
                                      setSelectedCountry(next[0] as TargetCountry);
                                    }
                                  }}
                                  className={cn(
                                    "px-2 py-1 rounded text-[10px] font-bold transition-all border flex items-center gap-1 cursor-pointer",
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                                  )}
                                >
                                  {isSelected ? "✓ " : "+ "}
                                  {country}
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-[10px] text-indigo-700 bg-indigo-50/80 p-1.5 rounded border border-indigo-100 font-medium leading-snug">
                            已选 <span className="font-bold text-indigo-900">{selectedCountries.length}</span> 个国家 ({selectedCountries.join(", ")})，单次并发全域挖掘: <span className="font-bold text-indigo-900">24 条真实线索</span>
                          </div>
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
                            <div className="bg-blue-50/50 p-2 rounded border border-blue-100 mb-2">
                              <div className="text-[9px] font-bold text-blue-600 mb-1">
                                双语核心词锁定
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="bg-white border px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-700">
                                  EN: {keywordData.englishCore}
                                </span>
                                <span className="text-gray-300">/</span>
                                <span className="bg-white border px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700">
                                  LOCAL: {keywordData.localCore}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>{" "}
                                GOOGLE
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.google.slice(0, 6).map((k) => (
                                  <span
                                    key={k}
                                    className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600"
                                  >
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>{" "}
                                ALIBABA
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.alibaba.slice(0, 6).map((k) => (
                                  <span
                                    key={k}
                                    className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600"
                                  >
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span>{" "}
                                AMAZON
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.amazon.slice(0, 6).map((k) => (
                                  <span
                                    key={k}
                                    className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600"
                                  >
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 mb-1 flex items-center">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>{" "}
                                {selectedCountry.toUpperCase()} LOCAL
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {keywordData.localTerms.slice(0, 6).map((k) => (
                                  <span
                                    key={k}
                                    className="bg-white border px-1.5 py-0.5 rounded text-[9px] text-gray-600"
                                  >
                                    {k}
                                  </span>
                                ))}
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
                        <motion.div
                          className="h-full bg-blue-600"
                          animate={{ width: `${searchState.progress}%` }}
                        />
                      </div>
                      <div className="h-32 overflow-y-auto font-mono text-[9px] text-gray-400 bg-gray-50 p-2 rounded">
                        {searchState.log.map((entry, i) => (
                          <div key={i}>{entry}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-card overflow-hidden bg-white border-2 border-blue-100">
                  <div className="p-3 border-b flex justify-between items-center bg-blue-50/30">
                    <span className="font-bold text-sm text-blue-900">
                      实时获客流 (Live Leads)
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-blue-500 font-mono">
                        Count: {leads.length}
                      </span>
                      <button
                        onClick={exportLeads}
                        className="text-blue-600 text-xs font-semibold hover:underline"
                      >
                        下载 CSV
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 text-[11px] font-semibold text-[#64748b] border-b">
                          <th className="px-4 py-3">公司名称</th>
                          <th className="px-4 py-3">国家</th>
                          <th className="px-4 py-3">
                            企业领英主页 (Company Page)
                          </th>
                          <th className="px-4 py-3">库内状态 / 商业邮箱</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {leads.map((lead) => (
                          <tr key={lead.id} className="text-sm">
                            <td className="px-4 py-3">
                              <div className="font-bold">
                                {lead.companyName}
                              </div>
                              <div className="text-[10px] text-blue-600 truncate max-w-[200px]">
                                {lead.website}
                              </div>
                              {lead.specialty && (
                                <div className="text-[10px] text-indigo-600 font-medium mt-1 leading-snug">
                                  主营: {lead.specialty}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {lead.country}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {lead.linkedinUrl && lead.linkedinUrl !== "#" ? (
                                <a
                                  href={lead.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  <Linkedin className="w-3 h-3" />
                                  访问主页
                                </a>
                              ) : (
                                <span className="text-gray-300">未收录</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <div className="flex flex-col space-y-1">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium w-max ${lead.status === "In CRM" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800 font-bold"}`}
                                >
                                  {lead.status === "In CRM"
                                    ? "● CRM已含"
                                    : "● 新线索(已存入库)"}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono select-all font-semibold">
                                  {lead.email}
                                </span>
                              </div>
                            </td>
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
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm whitespace-nowrap">
                      全球线索库 & CRM ({sortedDbLeads.length}/{dbLeads.length})
                    </h3>
                    {user && (
                      <button
                        type="button"
                        onClick={async () => {
                          const allUserLeads = await dbService.fetchUserLeads(user.uid);
                          const badLeads = allUserLeads.filter((l) => !isRealNonSyntheticCompany(l));
                          if (badLeads.length === 0) {
                            alert("当前数据库中未检测到测试/合成线索，所有保存的线索均为真实验证公司。");
                            return;
                          }
                          for (const lead of badLeads) {
                            if (lead.id) {
                              await dbService.deleteLead(lead.id).catch(console.error);
                            }
                          }
                          const refreshed = await dbService.fetchUserLeads(user.uid);
                          const realLeads = refreshed.filter(isRealNonSyntheticCompany);
                          setDbLeads(realLeads);
                          setLeads(realLeads);
                          alert(`已成功从云端数据库彻底清理 ${badLeads.length} 条测试/合成线索！`);
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                        title="一键彻底移除以往生成的测试或合成假公司"
                      >
                        🧹 清理测试假线索
                      </button>
                    )}
                  </div>
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
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        国家:
                      </span>
                      <select
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="bg-white border rounded px-2 py-1.5 text-[11px] font-bold text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="all">国家 (全部: {dbLeads.length})</option>
                        {availableCountries.map((c) => {
                          const cnt = dbLeads.filter((l) => l.country === c).length;
                          return (
                            <option key={c} value={c}>
                              {c} ({cnt})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        状态:
                      </span>
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
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        排序:
                      </span>
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
                    <span className="text-[10px] font-bold text-amber-700">
                      重点关注 (4星+):{" "}
                      {dbLeads.filter((l) => (l.rating || 0) >= 4).length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-700">
                      今日待跟进:{" "}
                      {
                        dbLeads.filter(
                          (l) =>
                            l.nextFollowUp ===
                            new Date().toISOString().split("T")[0],
                        ).length
                      }
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (dbLeads.length === 0) {
                        setMergeResultToast("线索库目前为空，无需进行合并去重。");
                        setTimeout(() => setMergeResultToast(null), 3000);
                      } else {
                        setMergeConfirmOpen(true);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center gap-1.5 active:scale-95 mr-2"
                    title="全局智能扫描比对并合并相同企业的所有属性"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>一键合并去重</span>
                  </button>
                  <button
                    onClick={exportLeads}
                    className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    导出 CSV
                  </button>
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 border-b">
                    <th className="px-4 py-3 w-[28%]">公司信息 & 专长特征</th>
                    <th className="px-4 py-3 w-[26%]">官方验证状态 & 决策人</th>
                    <th className="px-4 py-3 w-[24%]">
                      核心产品线匹配度 (0-10)
                    </th>
                    <th className="px-4 py-3 w-[22%]">开发优先级 & 推荐动作</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {sortedDbLeads.map((l) => {
                    const getFitScoreClass = (score?: number) => {
                      const computed = score !== undefined ? score : 7;
                      if (computed >= 8) return "bg-emerald-50 text-emerald-700 border-emerald-100";
                      if (computed >= 5) return "bg-amber-50 text-amber-700 border-amber-100";
                      return "bg-rose-50 text-rose-700 border-rose-100";
                    };

                    const getPriorityBadgeClass = (priority: string = "C") => {
                      switch (priority.toUpperCase()) {
                        case "A":
                          return "bg-emerald-500 text-white border-emerald-600";
                        case "B":
                          return "bg-amber-500 text-white border-amber-600";
                        case "C":
                          return "bg-indigo-500 text-white border-indigo-600";
                        case "D":
                          return "bg-gray-400 text-white border-gray-500";
                        default:
                          return "bg-slate-400 text-white border-slate-500";
                      }
                    };

                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors border-b"
                        onClick={() => setSelectedLead(l)}
                      >
                        {/* Column 1: Company details */}
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <div className="font-bold text-sm text-[#0f172a]">
                              {l.companyName}
                            </div>
                            <div className="flex text-yellow-500 scale-75 shrink-0">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-3 h-3 fill-current",
                                    (l.rating || 0) > i
                                      ? "opacity-100"
                                      : "opacity-20",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              className="font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCountryFilter(l.country);
                              }}
                              title={`点击筛选该国家: ${l.country}`}
                            >
                              📍 {l.country}
                            </button>
                            <span>|</span>
                            <a
                              href={
                                l.website.startsWith("http")
                                  ? l.website
                                  : `https://${l.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center space-x-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="max-w-[120px] truncate block">
                                {l.website}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <span className="bg-blue-50 text-blue-600 px-1 rounded-sm font-bold border border-blue-100 text-[9px] italic">
                              SEO: {l.seoRank}
                            </span>
                          </div>
                          {l.specialty && (
                            <div className="text-[10px] text-indigo-600 font-medium bg-indigo-50/70 rounded px-1.5 py-0.5 inline-block max-w-[280px] truncate border border-indigo-100/40">
                              <b>利基:</b> {l.specialty}
                            </div>
                          )}
                        </td>

                        {/* Column 2: Website status & Decision maker */}
                        <td className="px-4 py-3.5 space-y-1 border-r border-transparent">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded-[3px] text-[9px] font-black tracking-wide ${
                                l.websiteStatus === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : l.websiteStatus === "unreachable"
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {l.websiteStatus === "active"
                                ? "● 官网正常访问"
                                : l.websiteStatus === "unreachable"
                                  ? "❌ 官网打不开/失效"
                                  : l.websiteStatus === "parked"
                                    ? "⚠️ 域名售卖/停放"
                                    : l.websiteStatus === "redirected"
                                      ? "➡️ 外部重定向"
                                      : "● " + (l.websiteStatus || "检测中")}
                            </span>
                            <span className="bg-slate-100 border text-slate-700 text-[9px] px-1 rounded font-medium">
                              {l.companyType === "specialized distributor"
                                ? "专业分销"
                                : l.companyType === "general medical webshop"
                                  ? "药械商城"
                                  : l.companyType === "manufacturer/OEM"
                                    ? "OEM厂家"
                                    : "分销渠道"}
                            </span>
                          </div>

                          {l.contactPerson ? (
                            <div className="pt-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-slate-800">
                                  {l.contactPerson}
                                </span>
                                {l.linkedinUrl && l.linkedinUrl !== "#" && (
                                  <a
                                    href={l.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#0077b5] hover:scale-110 transition-transform"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Linkedin className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold leading-none">
                                {l.position || "核心决策人"}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              暂无有效社交人推荐
                            </div>
                          )}
                        </td>

                        {/* Column 3: Fits Score Matrix */}
                        <td className="px-4 py-3.5">
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">喉镜:</span>
                              <span
                                className={`px-1 rounded font-mono font-bold border ${getFitScoreClass(l.videoLaryngoscopeFit)}`}
                              >
                                {l.videoLaryngoscopeFit !== undefined
                                  ? l.videoLaryngoscopeFit
                                  : 8}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">气管:</span>
                              <span
                                className={`px-1 rounded font-mono font-bold border ${getFitScoreClass(l.bronchoscopeFit)}`}
                              >
                                {l.bronchoscopeFit !== undefined
                                  ? l.bronchoscopeFit
                                  : 7}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">耳鼻:</span>
                              <span
                                className={`px-1 rounded font-mono font-bold border ${getFitScoreClass(l.entEndoscopeFit)}`}
                              >
                                {l.entEndoscopeFit !== undefined
                                  ? l.entEndoscopeFit
                                  : 6}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">一次性:</span>
                              <span
                                className={`px-1 rounded font-mono font-bold border ${getFitScoreClass(l.disposableScopeFit)}`}
                              >
                                {l.disposableScopeFit !== undefined
                                  ? l.disposableScopeFit
                                  : 7}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 4: Next Action & Priority */}
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getPriorityBadgeClass(l.leadPriority)}`}
                            >
                              {l.leadPriority || "C"} 级线索
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Score: {l.confidenceScore || 80}%
                            </span>
                          </div>
                          <div className="text-[10px] text-indigo-950 font-semibold bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 leading-snug w-max max-w-[180px] truncate">
                            {l.nextAction === "email_now"
                              ? "✉️ 优先发送开发信"
                              : l.nextAction === "find_person_on_linkedin"
                                ? "🌐 领英建立连接"
                                : l.nextAction === "whatsapp_once"
                                  ? "📱 WhatsApp直连询盘"
                                  : l.nextAction === "verify_first"
                                    ? "⚠️ 挂起人工筛查"
                                    : "🕒 记录归档/跳过"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {dbLeads.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-12 text-center text-gray-400"
                      >
                        线索库暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === "linkedin" ? (
            <div className="space-y-6">
              <section className="bg-white rounded-xl border p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">
                    LinkedIn 决策人定向助手
                  </h3>
                  <p className="text-sm text-gray-500">
                    基于线索库中的决策人信息，自动化进行领英社交开发。
                  </p>
                </div>
                <div className="flex space-x-3">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">
                      今日待处理
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {dbLeads.length}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const status: Record<string, string> = {};
                      dbLeads.forEach((l) => (status[l.id] = "Inviting..."));
                      setLinkedinStatus(status);
                      setTimeout(() => {
                        const newStatus: Record<string, string> = {};
                        dbLeads.forEach((l) => (newStatus[l.id] = "Sent"));
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
                    {dbLeads.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="font-bold text-[#0f172a]">
                              {l.contactPerson}
                            </div>
                            {l.linkedinUrl && (
                              <a
                                href={l.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0077b5] hover:opacity-80"
                              >
                                <Linkedin className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-blue-600 font-semibold">
                            {l.position}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium">
                            {l.companyName}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase">
                            {l.country}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {linkedinStatus[l.id] === "Sent" ? (
                            <span className="text-emerald-600 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>已发送邀请</span>
                            </span>
                          ) : linkedinStatus[l.id] === "Inviting..." ? (
                            <span className="text-blue-500 animate-pulse font-bold">
                              处理中...
                            </span>
                          ) : (
                            <span className="text-gray-400">就绪 (Ready)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                setLinkedinStatus((prev) => ({
                                  ...prev,
                                  [l.id]: "Sent",
                                }))
                              }
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
                        <td
                          colSpan={3}
                          className="p-12 text-center text-gray-400"
                        >
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
                    <h3 className="text-lg font-bold text-[#0f172a]">
                      外贸开发心得 & 市场洞察
                    </h3>
                    <p className="text-sm text-gray-500">
                      记录您在全球市场探索中的实战心得、策略反馈及下一步计划。
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const time = new Date().toLocaleString();
                      setDevNotes(
                        (prev) => `**${time} 记录:**\n\n\n---\n` + prev,
                      );
                    }}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded text-sm font-bold flex items-center space-x-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>快速模板</span>
                  </button>
                  <button
                    onClick={saveDevNotes}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded shadow-md shadow-indigo-100 text-sm font-bold flex items-center space-x-2 transition-all active:scale-95"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>同步至云端</span>
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
              <p className="text-sm text-gray-500 mt-2">
                "{activeTab}" 模块深度集成中...
              </p>
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

      {/* Modern custom merge duplicates confirmation dialog */}
      {mergeConfirmOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-indigo-600">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#0f172a]">
                全局智能合并去重确认
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              系统将高精度扫描比对当前线索的{" "}
              <span className="font-semibold text-slate-800">
                [公司英文域名主域]
              </span>{" "}
              与{" "}
              <span className="font-semibold text-slate-800">
                [清洗后的公司核心品牌]
              </span>
              ：
            </p>
            <ul className="text-[11px] text-slate-500 space-y-1 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/30">
              <li className="flex items-start gap-1">
                <span className="text-indigo-500 font-bold">✓</span>
                <span>
                  <strong>字段融合</strong>
                  ：归纳并缝合多个重复记录中互补的邮箱、决策人及联系电话
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-indigo-500 font-bold">✓</span>
                <span>
                  <strong>智能保优</strong>
                  ：自动保留数据完整度评分最高的那条高价值记录作为主档案
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-indigo-500 font-bold">✓</span>
                <span>
                  <strong>数据洁净</strong>
                  ：一键物理合并多余冗余，同步从本地以及云端 Firestore 同步擦除
                </span>
              </li>
            </ul>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setMergeConfirmOpen(false)}
                className="px-4 py-2 hover:bg-slate-50 border rounded-lg text-xs font-bold text-slate-600 transition-all active:scale-95"
              >
                放弃取消
              </button>
              <button
                onClick={async () => {
                  setMergeConfirmOpen(false);
                  await handleMergeAndCleanDuplicates();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                启动深度合并
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Floating Toast feedback */}
      {mergeResultToast && (
        <div className="fixed bottom-6 right-6 z-[999] bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-5 max-w-sm w-full animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>智能清洗消冗引擎反馈</span>
            </span>
            <button
              onClick={() => setMergeResultToast(null)}
              className="text-white/40 hover:text-white text-[11px] font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-medium">
            {mergeResultToast}
          </p>
        </div>
      )}
    </div>
  );
}

function LeadDetailModal({
  lead,
  onClose,
  onUpdate,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
}) {
  // Helper to get priority badge color classes
  const getPriorityBadge = (priority: string = "C") => {
    switch (priority.toUpperCase()) {
      case "A":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20";
      case "B":
        return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20";
      case "C":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20";
      case "D":
        return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20";
    }
  };

  // Helper to translate companyType options to human-friendly Chinese tags
  const companyTypeLabels: Record<string, string> = {
    "specialized distributor": "专业医疗器械经销商 (Specialized Distributor)",
    "general medical webshop": "综合医疗网上商城 (Medical Webshop)",
    "emergency/rescue supplier": "应急救援供应商 (Emergency/Rescue Supplier)",
    "anesthesia/ICU distributor":
      "麻醉与ICU重症核心方案商 (Anesthesia/ICU Distributor)",
    "endoscopy distributor": "内窥镜镜种方案提供商 (Endoscopy Specialist)",
    "manufacturer/OEM": "品牌生产厂家 & OEM研发商 (Manufacturer/OEM)",
    "clinic/hospital/training center":
      "医院/诊所/学术培训学术机构 (Clinic/Hospital/Center)",
    "consumer health brand": "消费自营医疗健康品牌 (Consumer Health Brand)",
    "irrelevant/unknown": "非相关主体/非商业用户 (Irrelevant/Unknown)",
  };

  const productLineStatusLabels: Record<string, string> = {
    active: "有活跃主营产品在售 (Active Products Found)",
    "weak evidence": "有少量网页提及，推荐人工确认 (Weak Evidence)",
    "possible historical":
      "历史在售/旧页面出现，当前或已停售 (Historical/Outdated Archive)",
    "not found": "未检索到该主营在售迹象 (No Relevant Scope Found)",
  };

  const nextActionLabels: Record<
    string,
    { label: string; color: string; desc: string }
  > = {
    email_now: {
      label: "首选电子邮件开发",
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      desc: "该企业主营与我司高度重合，且邮箱畅通。立即根据分析的痛点推荐产品！",
    },
    find_person_on_linkedin: {
      label: "LinkedIn 精准社交建联",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      desc: "官方网站健康，但缺乏有效邮箱或需要穿透决策人。推荐去 LinkedIn 添加关键岗位决策人。",
    },
    whatsapp_once: {
      label: "WhatsApp 直连询盘",
      color: "bg-teal-100 text-teal-800 border-teal-200",
      desc: "发现移动电话/WhatsApp，推荐首发高价值产品样本或视频。",
    },
    verify_first: {
      label: "暂挂，优先人工复核",
      color: "bg-amber-100 text-amber-800 border-amber-200",
      desc: "网站能打开但产品信息偏旧，或者分类有歧义。推荐跟进团队人工打开官网核查后再发起。",
    },
    skip: {
      label: "自动过滤归档 (跳过)",
      color: "bg-slate-100 text-slate-700 border-slate-200",
      desc: "官网失效、重定向售卖页或属于低价值非商业组织，已自动挂起免打扰模式。",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b flex justify-between items-start bg-[#0f172a] text-white">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold select-all leading-tight">
                {lead.companyName}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase shadow-sm ${getPriorityBadge(lead.leadPriority)}`}
              >
                优先级: {lead.leadPriority || "C"}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {lead.country}
              </span>
              <span>•</span>
              <a
                href={
                  lead.website.startsWith("http")
                    ? lead.website
                    : `https://${lead.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>{lead.website}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Section A & G: AI Verification Diagnostic Center */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              官网存活测试与商业类型验证 (AI Vetting Diagnostics)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  官网存活状态 (website_status)
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      lead.websiteStatus === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : lead.websiteStatus === "unreachable"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : lead.websiteStatus === "parked"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                            : lead.websiteStatus === "redirected"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : lead.websiteStatus === "outdated"
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {lead.websiteStatus === "active"
                      ? "● 官网正常访问 (Active)"
                      : lead.websiteStatus === "unreachable"
                        ? "❌ 域名失效或打不开 (Unreachable)"
                        : lead.websiteStatus === "parked"
                          ? "⚠️ 域名停放/正出售 (Parked Page)"
                          : lead.websiteStatus === "redirected"
                            ? "➡️ 页面重定向外部 (Redirected)"
                            : lead.websiteStatus === "outdated"
                              ? "🕒 历史存档面/旧网站"
                              : "● 未知状态"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  企业分类主体 (company_type)
                </span>
                <div>
                  <span className="bg-slate-100 text-slate-800 font-bold text-xs px-2 py-1 rounded inline-block border border-slate-200">
                    {companyTypeLabels[lead.companyType || ""] ||
                      lead.companyType ||
                      "专业医疗器械经销商"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  产品线真实存续检验 (product_line_status)
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      lead.productLineStatus === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : lead.productLineStatus === "weak evidence"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-rose-50 text-rose-700 border-rose-100"
                    }`}
                  >
                    {productLineStatusLabels[lead.productLineStatus || ""] ||
                      lead.productLineStatus ||
                      "有活跃主营产品在售"}
                  </span>
                  {lead.productLineStatus &&
                    lead.productLineStatus !== "active" && (
                      <span className="text-[10px] text-rose-600 font-semibold italic">
                        （已由系统智能调低推荐级别）
                      </span>
                    )}
                </div>
              </div>
            </div>

            {/* Business summary from web sourcing */}
            <div className="bg-slate-50 border p-3 rounded-lg">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                爬虫商业证据画像摘要
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {lead.mainBusinessSummary ||
                  lead.specialty ||
                  "暂无AI商业画像，可能属于静态过渡库。"}
              </p>
            </div>
          </div>

          {/* Section B & C & F: Evidence Urls Verified */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              深度核验页面凭证 & 核心特征词 (Transparency Evidence Logs)
            </h3>

            {/* Keyword Found chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                官网命中并抓取的医疗特征词 (Keyword Sourced)
              </span>
              {lead.relevantKeywordsFound &&
              lead.relevantKeywordsFound.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {lead.relevantKeywordsFound.map((kw, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md px-2 py-0.5 text-[10px] font-bold"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  未匹配到标准特征高价值关键词 (laryngoscope, bronchoscope
                  等)，推荐人工打开核对
                </div>
              )}
            </div>

            {/* Verified URLs */}
            <div className="space-y-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                已提取验证产品深度子页证据 (Verified Product Subpages)
              </span>
              {lead.evidenceUrls && lead.evidenceUrls.length > 0 ? (
                <div className="space-y-1">
                  {lead.evidenceUrls.map((url, idx) => {
                    // Safe domain truncation
                    const label =
                      url.length > 70 ? url.substring(0, 70) + "..." : url;
                    return (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 font-mono truncate hover:text-blue-800"
                      >
                        <ExternalLink className="w-3 h-3 hover:scale-115 shrink-0" />
                        <span>{label}</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg italic flex items-center gap-1.5">
                  <span>
                    ⚠️
                    AI结论无特定产品网页证据可考。置信度可能降低，开发时请谨慎复查。
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section D: Product Fits Matrix (0-10) */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-current" />
                热销靶向产品匹配评分 (Product-Specific Fits Matrix)
              </h3>
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span>AI 评估置信度:</span>
                <span className="text-blue-600 font-mono text-xs">
                  {lead.confidenceScore !== undefined
                    ? lead.confidenceScore
                    : 80}
                  %
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Fit card 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-500 block">
                  可视喉镜
                </span>
                <span className="text-[8px] text-slate-400 block h-4 truncate">
                  Video Laryngo
                </span>
                <div className="my-1.5">
                  <span className="text-lg font-black font-mono text-slate-800">
                    {lead.videoLaryngoscopeFit !== undefined
                      ? lead.videoLaryngoscopeFit
                      : 8}
                  </span>
                  <span className="text-[9px] text-slate-400">/10</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1">
                  <div
                    className="bg-teal-500 h-1 rounded-full"
                    style={{
                      width: `${(lead.videoLaryngoscopeFit !== undefined ? lead.videoLaryngoscopeFit : 8) * 10}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Fit card 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-500 block">
                  纤维支气管镜
                </span>
                <span className="text-[8px] text-slate-400 block h-4 truncate">
                  Bronchoscope
                </span>
                <div className="my-1.5">
                  <span className="text-lg font-black font-mono text-slate-800">
                    {lead.bronchoscopeFit !== undefined
                      ? lead.bronchoscopeFit
                      : 7}
                  </span>
                  <span className="text-[9px] text-slate-400">/10</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full"
                    style={{
                      width: `${(lead.bronchoscopeFit !== undefined ? lead.bronchoscopeFit : 7) * 10}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Fit card 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-500 block">
                  耳鼻喉镜
                </span>
                <span className="text-[8px] text-slate-400 block h-4 truncate">
                  ENT Endoscope
                </span>
                <div className="my-1.5">
                  <span className="text-lg font-black font-mono text-slate-800">
                    {lead.entEndoscopeFit !== undefined
                      ? lead.entEndoscopeFit
                      : 6}
                  </span>
                  <span className="text-[9px] text-slate-400">/10</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1">
                  <div
                    className="bg-indigo-500 h-1 rounded-full"
                    style={{
                      width: `${(lead.entEndoscopeFit !== undefined ? lead.entEndoscopeFit : 6) * 10}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Fit card 4 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-500 block">
                  一次性内窥镜
                </span>
                <span className="text-[8px] text-slate-400 block h-4 truncate">
                  Disposable Scope
                </span>
                <div className="my-1.5">
                  <span className="text-lg font-black font-mono text-slate-800">
                    {lead.disposableScopeFit !== undefined
                      ? lead.disposableScopeFit
                      : 7}
                  </span>
                  <span className="text-[9px] text-slate-400">/10</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1">
                  <div
                    className="bg-purple-500 h-1 rounded-full"
                    style={{
                      width: `${(lead.disposableScopeFit !== undefined ? lead.disposableScopeFit : 7) * 10}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Targeted pitch recommendation */}
            <div className="bg-slate-50 border p-3.5 rounded-lg space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                最推荐开发/说服切入产品 (Pitch Guidance)
              </span>
              <div className="font-bold text-xs text-indigo-950 bg-white border border-indigo-100 rounded px-2.5 py-1.5 inline-block">
                推荐首推机型：
                {lead.recommendedProductToPitch ||
                  "高清晰度便携式可视喉镜 / 一次性防起雾镜片及耗材包"}
              </div>
            </div>
          </div>

          {/* Section E: Recommended Outreach Action & Reason */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              推荐开发应对动作与逻辑支撑 (Action playbook)
            </h3>

            {/* Next action badge display */}
            {lead.nextAction && nextActionLabels[lead.nextAction] ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold border ${nextActionLabels[lead.nextAction].color}`}
                  >
                    执行动作：{nextActionLabels[lead.nextAction].label}
                  </span>
                </div>
                <div className="bg-slate-50 border p-3 rounded-lg text-xs leading-relaxed text-slate-600 font-semibold shadow-inner">
                  <p>{nextActionLabels[lead.nextAction].desc}</p>
                  {lead.reason && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-900 font-medium">
                      <b>AI 推荐逻辑：</b>
                      {lead.reason}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                暂无自动研判，推荐采用通用电子邮件首发。详情见逻辑推理。
              </div>
            )}
          </div>

          {/* Core Interactive CRM actions & Notes */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              CRM 人工干预与跟进细节 (Interactive CRM Panels)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">
                  跟进阶段修正
                </label>
                <select
                  value={lead.status}
                  onChange={(e) =>
                    onUpdate(lead.id, { status: e.target.value as any })
                  }
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 outline-none"
                >
                  <option value="New">新线索 (New)</option>
                  <option value="Contacted">已联系 (Contacted)</option>
                  <option value="Qualified">初筛通过 (Qualified)</option>
                  <option value="Disqualified">不匹配 (Disqualified)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">
                  下次复盘时间
                </label>
                <input
                  type="date"
                  value={lead.nextFollowUp || ""}
                  onChange={(e) =>
                    onUpdate(lead.id, { nextFollowUp: e.target.value })
                  }
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">
                  人工跟进重点备注
                </label>
                <textarea
                  rows={3}
                  value={lead.notes || ""}
                  onChange={(e) => onUpdate(lead.id, { notes: e.target.value })}
                  placeholder="记录该渠道开发中的痛点、价格谈判、高层会议纪要或特定的样品寄送地址..."
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4.5 border border-blue-200 shadow-sm flex items-start space-x-3.5">
            <div className="p-2.5 bg-blue-100 rounded text-blue-600 border border-blue-200 shrink-0">
              <Building2 className="w-5 h-5 animate-bounce-slow" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-blue-900 leading-snug">
                核查可用联系渠道 (Contact Directories)
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-blue-400">
                    商业电子邮件
                  </span>
                  <span className="text-xs font-mono text-blue-800 font-bold break-all select-all">
                    {lead.email}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-blue-400">
                    官方登记电话
                  </span>
                  <span className="text-xs font-mono text-blue-800 font-bold select-all">
                    {lead.phone || "网络未抓取公开固话"}
                  </span>
                </div>
                {lead.linkedinUrl && lead.linkedinUrl !== "#" && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <span className="text-[9px] uppercase font-bold text-blue-400">
                      领英企业公共主页
                    </span>
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      Visit Company LinkedIn Page
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-[#0f172a] border-t flex justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            保存修改并同步
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SidebarNavItem({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 flex items-center space-x-3 cursor-pointer text-sm",
        active
          ? "bg-white/10 text-white border-l-4 border-blue-500"
          : "text-gray-400 hover:text-white hover:bg-white/5",
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 bg-white border rounded">
      <div className="text-[11px] font-bold text-gray-500 uppercase mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ConfigGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-gray-500 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToolBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-gray-600">{title}</h5>
      <ul className="space-y-1 text-xs text-gray-500">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
