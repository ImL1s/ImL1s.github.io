// i18n - Internationalization for ImL1s Portfolio
const translations = {
    'zh-TW': {
        // Navigation
        'nav.projects': '專案',
        'nav.skills': '技能',
        'nav.contact': '聯繫',

        // Hero Section
        'hero.badge': 'Full Stack Developer',
        'hero.title': 'Building Digital Products',
        'hero.title.highlight': 'That Matter',
        'hero.description': '專注於 Flutter、React、TypeScript 的全端開發者。熱愛打造跨平台應用程式與開源專案。',
        'hero.stat.projects': '公開專案',
        'hero.stat.apps': '上架應用',
        'hero.stat.chains': '支援區塊鏈',

        // Projects Section
        'projects.title': 'Featured Projects',
        'projects.subtitle': '涵蓋行動應用、Web 應用、瀏覽器擴充功能與開源專案',

        // Project: StickerAI
        'project.stickerai.title': 'StickerAI Studio',
        'project.stickerai.desc': '全新 AI 貼圖生成器！上傳一張照片，Google Gemini AI 自動生成完整 LINE 貼圖包。保持角色一致性，支援多種風格（Cutecore、Kawaii、Pixel Art、Watercolor 等），一鍵下載符合 LINE 規範的 ZIP 檔。',

        // Project: Light Wallet
        'project.lightwallet.title': 'Light Wallet',
        'project.lightwallet.desc': '輕量級多鏈加密貨幣錢包，支援 43+ 區塊鏈包含 Bitcoin、Ethereum、Solana、TON、Cosmos 等。',

        // Project: Crypto AI
        'project.cryptoai.title': '加密 AI 分析',
        'project.cryptoai.desc': 'AI 驅動的加密貨幣市場分析平台。整合恐懼貪婪指數、多空比、ETF 資金流等 5+ 數據源，支援 AI 圖表分析。',

        // Project: Light Wallet Extension
        'project.extension.title': 'Light Wallet Extension',
        'project.extension.desc': '輕量級加密貨幣錢包瀏覽器擴充功能，使用 React + TypeScript 開發，支援 EVM 相容鏈。',

        // Project: Insurance Pass
        'project.insurance.title': '保險證照考試題庫',
        'project.insurance.desc': '台灣保險證照考試練習 APP，涵蓋人身、財產、投資型保險等。支援 AI 解釋、雲端同步、模擬考試。',

        // Project: Taxi Pass
        'project.taxi.title': '計程車執業登記證模擬考',
        'project.taxi.desc': '台灣計程車執業登記證考試練習 APP。包含交通法規、地理環境共 236 題，支援 AI 助手功能。',

        // Project: AutoStar
        'project.autostar.title': 'AutoStar 汽車實價登錄',
        'project.autostar.desc': '您的二手車價格查詢專家！揭露真實車價，即時同步全台二手車成交價、智能估價試算、收藏追蹤心儀車款。支援品牌車系篩選、價格比較分析、即時價格通知。',

        // Project: Safer Radar
        'project.saferradar.title': '安心雷達 Safer Radar',
        'project.saferradar.desc': '提供即時治安通知與犯罪風險地圖的社區安全應用。支援 12 種語言，包含風險熱點分析與事件回報功能。',

        // Project: Hello World
        'project.helloworld.title': 'Multi-Language Hello World',
        'project.helloworld.desc': '60+ 程式語言的 Hello World 實作集合，包含編譯型、直譯型、函數式等類別。附自動測試腳本。',

        // Project: TodoList
        'project.todolist.title': 'TodoList - 100+ 技術棧',
        'project.todolist.desc': '同一個 Todo List 應用的 100+ 種實現。涵蓋 Web、Mobile、Desktop、遊戲引擎等完整學習資源。',

        // Protect: Lobster
        'project.lobster.title': 'Lobster - AI Agent Social',
        'project.lobster.desc': 'Moltbook 平台的第三方客戶端',

        // Project: RentAHuman
        'project.rentahuman.title': 'RentAHuman: AI Hires Humans',
        'project.rentahuman.desc': 'AI 代理人僱用真人完成任務',

        // Project: MoltX
        'project.moltx.title': 'MoltX: AI Agent Social Feed',
        'project.moltx.desc': 'AI 代理人的社群推文平台',

        // Project: Intake
        'project.intake.title': 'Intake',
        'project.intake.desc': '在 Telegram 中建立高品質表單',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': '基於 OpenClaw 構建的隨身 AI 代理人',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': '將 X/Twitter 貼文儲存為結構化筆記',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw AI Gateway',
        'project.clawhub.desc': '單一 API 整合多種 AI 模型的統一網關',

        // Skills Section
        'skills.title': 'Tech Stack',
        'skills.subtitle': '專精於跨平台開發與現代前端技術',
        'skills.mobile': 'Mobile',
        'skills.frontend': 'Frontend',
        'skills.backend': 'Backend & Cloud',
        'skills.blockchain': 'Blockchain',
        'skills.state': 'State Management',
        'skills.ai': 'AI Integration',

        // Services Section
        'nav.services': '服務',
        'services.available': '目前可接案',
        'services.title': '我能為你打造什麼',
        'services.subtitle': '從構想到上架，一條龍完成。不限產業類型，任何案子都歡迎聊聊。',
        'services.mobile.title': 'Mobile App 開發',
        'services.mobile.desc': 'iOS / Android 跨平台 App，以 Flutter 為核心。從開發、上架到營利（IAP、廣告）一條龍服務。',
        'services.web.title': 'Web / 全端開發',
        'services.web.desc': '前端 React / Next.js / Vue，後端 Go / Node.js / .NET Core / Java。全端一手包辦。',
        'services.blockchain.title': '區塊鏈 / Web3',
        'services.blockchain.desc': '加密錢包、DApp、智能合約整合。支援 43+ 區塊鏈，多鏈資產管理方案。',
        'services.ai.title': 'AI 整合',
        'services.ai.desc': 'Gemini / OpenAI / Claude API 整合到你的產品中。AI 聊天、圖像生成、智能分析、MCP Server 開發。',
        'services.desktop.title': 'Desktop App',
        'services.desktop.desc': 'Tauri / Electron 跨平台桌面軟體。macOS 公證簽署、Windows、Linux 三平台一次搞定。',
        'services.consulting.title': '技術顧問',
        'services.consulting.desc': '架構設計、Code Review、技術選型建議。Firebase / GA4 / CI/CD 全方位支援。',
        'services.cta.title': '有專案想法？讓我們聊聊',
        'services.cta.desc': '無論是全新專案或現有產品的功能擴充，歡迎隨時聯繫。',
        'services.cta.btn': '聯繫我',

        // Contact Section
        'contact.title': 'Get In Touch',
        'contact.subtitle': '歡迎交流合作',

        // Footer
        'footer.copyright': '© 2025 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
        'platform.chrome': 'Chrome Extension',
        'platform.chrome': 'Chrome Extension',
        'platform.opensource': 'Open Source',

        // Resume Page
        'nav.resume': '履歷',
        'resume.role': '資深全端工程師 & 區塊鏈專家',
        'resume.intro': '擁有 12 年以上產業經驗。10 年 Android、5 年 Flutter，並熟悉後端 (.NET/Go/Java/Node.js)、iOS、React Native 與 Unity 開發。',
        'resume.about': '關於我',
        'resume.exp': '工作經驗',
        'resume.exp.total': '12+ 年總經驗',
        'resume.exp.android': '10 年 Android 開發',
        'resume.exp.flutter': '5 年 Flutter 開發',
        'resume.exp.backend': '後端 (.NET/Go/Java/Node.js)',
        'resume.exp.other': 'iOS / React Native / Unity',
        'resume.exp.blockchain': '區塊鏈經驗自 2013',
        'resume.style': '工作風格',
        'resume.style.remote': '偏好遠端工作',
        'resume.style.intl': '跨國合作經驗 (柬埔寨、越南、日本、中國)',
        'resume.style.review': '代碼審查 & 架構設計',
        'resume.lang': '語言能力',
        'resume.lang.cn': '中文 (母語)',
        'resume.lang.en': '英文 (可溝通)',
        'resume.lang.jp': '日文 (基礎會話)',
        'resume.tech.android': 'Android 開發',
        'resume.tech.ios': 'iOS 開發',
        'resume.tech.blockchain': '區塊鏈 & Solidity',
        'resume.tech.flutter': '跨平台開發 (Flutter)',
        'resume.tech.backend': '後端 & 其他'
    },

    'zh-CN': {
        // Navigation
        'nav.projects': '项目',
        'nav.skills': '技能',
        'nav.contact': '联系',

        // Hero Section
        'hero.badge': 'Full Stack Developer',
        'hero.title': 'Building Digital Products',
        'hero.title.highlight': 'That Matter',
        'hero.description': '专注于 Flutter、React、TypeScript 的全栈开发者。热爱打造跨平台应用程序与开源项目。',
        'hero.stat.projects': '公开项目',
        'hero.stat.apps': '上架应用',
        'hero.stat.chains': '支持区块链',

        // Projects Section
        'projects.title': 'Featured Projects',
        'projects.subtitle': '涵盖移动应用、Web 应用、浏览器扩展功能与开源项目',

        // Project: StickerAI
        'project.stickerai.title': 'StickerAI Studio',
        'project.stickerai.desc': '全新 AI 贴图生成器！上传一张照片，Google Gemini AI 自动生成完整 LINE 贴图包。保持角色一致性，支持多种风格（Cutecore、Kawaii、Pixel Art、Watercolor 等），一键下载符合 LINE 规范的 ZIP 档。',

        // Project: Light Wallet
        'project.lightwallet.title': 'Light Wallet',
        'project.lightwallet.desc': '轻量级多链加密货币钱包，支持 43+ 区块链包含 Bitcoin、Ethereum、Solana、TON、Cosmos 等。',

        // Project: Crypto AI
        'project.cryptoai.title': '加密 AI 分析',
        'project.cryptoai.desc': 'AI 驱动的加密货币市场分析平台。整合恐惧贪婪指数、多空比、ETF 资金流等 5+ 数据源，支持 AI 图表分析。',

        // Project: Light Wallet Extension
        'project.extension.title': 'Light Wallet Extension',
        'project.extension.desc': '轻量级加密货币钱包浏览器扩展功能，使用 React + TypeScript 开发，支持 EVM 兼容链。',

        // Project: Insurance Pass
        'project.insurance.title': '保险证照考试题库',
        'project.insurance.desc': '台湾保险证照考试练习 APP，涵盖人身、财产、投资型保险等。支持 AI 解释、云端同步、模拟考试。',

        // Project: Taxi Pass
        'project.taxi.title': '计程车执业登记证模拟考',
        'project.taxi.desc': '台湾计程车执业登记证考试练习 APP。包含交通法规、地理环境共 236 题，支持 AI 助手功能。',

        // Project: AutoStar
        'project.autostar.title': 'AutoStar 汽车实价登录',
        'project.autostar.desc': '您的二手车价格查询专家！揭露真实车价，即时同步全台二手车成交价、智能估价试算、收藏追踪心仪车款。支持品牌车系筛选、价格比较分析、即时价格通知。',

        // Project: Safer Radar
        'project.saferradar.title': '安心雷达 Safer Radar',
        'project.saferradar.desc': '提供即时治安通知与犯罪风险地图的社区安全应用。支持 12 种语言，包含风险热点分析与事件回报功能。',

        // Project: Hello World
        'project.helloworld.title': 'Multi-Language Hello World',
        'project.helloworld.desc': '60+ 编程语言的 Hello World 实现集合，包含编译型、解释型、函数式等类别。附自动测试脚本。',

        // Project: TodoList
        'project.todolist.title': 'TodoList - 100+ 技术栈',
        'project.todolist.desc': '同一个 Todo List 应用的 100+ 种实现。涵盖 Web、Mobile、Desktop、游戏引擎等完整学习资源。',

        // Project: Lobster
        'project.lobster.title': 'Lobster - AI Agent Social',
        'project.lobster.desc': 'Moltbook 平台的第三方客户端',

        // Project: RentAHuman
        'project.rentahuman.title': 'RentAHuman: AI Hires Humans',
        'project.rentahuman.desc': 'AI 代理人雇用真人完成任务',

        // Project: MoltX
        'project.moltx.title': 'MoltX: AI Agent Social Feed',
        'project.moltx.desc': 'AI 代理人的社交推文平台',

        // Project: Intake
        'project.intake.title': 'Intake',
        'project.intake.desc': '在 Telegram 中创建高质量表单',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': '基于 OpenClaw 构建的随身 AI 代理人',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': '将 X/Twitter 帖子保存为结构化笔记',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw AI Gateway',
        'project.clawhub.desc': '单一 API 整合多种 AI 模型的统一网关',

        // Skills Section
        'skills.title': 'Tech Stack',
        'skills.subtitle': '专精于跨平台开发与现代前端技术',
        'skills.mobile': 'Mobile',
        'skills.frontend': 'Frontend',
        'skills.backend': 'Backend & Cloud',
        'skills.blockchain': 'Blockchain',
        'skills.state': 'State Management',
        'skills.ai': 'AI Integration',

        // Services Section
        'nav.services': '服务',
        'services.available': '目前可接案',
        'services.title': '我能为你打造什么',
        'services.subtitle': '从构想到上架，一条龙完成。不限产业类型，任何案子都欢迎聊聊。',
        'services.mobile.title': 'Mobile App 开发',
        'services.mobile.desc': 'iOS / Android 跨平台 App，以 Flutter 为核心。从开发、上架到营利（IAP、广告）一条龙服务。',
        'services.web.title': 'Web / 全栈开发',
        'services.web.desc': '前端 React / Next.js / Vue，后端 Go / Node.js / .NET Core / Java。全栈一手包办。',
        'services.blockchain.title': '区块链 / Web3',
        'services.blockchain.desc': '加密钱包、DApp、智能合约整合。支持 43+ 区块链，多链资产管理方案。',
        'services.ai.title': 'AI 整合',
        'services.ai.desc': 'Gemini / OpenAI / Claude API 整合到你的产品中。AI 聊天、图像生成、智能分析、MCP Server 开发。',
        'services.desktop.title': 'Desktop App',
        'services.desktop.desc': 'Tauri / Electron 跨平台桌面软件。macOS 公证签署、Windows、Linux 三平台一次搞定。',
        'services.consulting.title': '技术顾问',
        'services.consulting.desc': '架构设计、Code Review、技术选型建议。Firebase / GA4 / CI/CD 全方位支持。',
        'services.cta.title': '有项目想法？让我们聊聊',
        'services.cta.desc': '无论是全新项目或现有产品的功能扩充，欢迎随时联系。',
        'services.cta.btn': '联系我',

        // Contact Section
        'contact.title': 'Get In Touch',
        'contact.subtitle': '欢迎交流合作',

        // Footer
        'footer.copyright': '© 2025 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
        'platform.chrome': 'Chrome Extension',
        'platform.chrome': 'Chrome Extension',
        'platform.opensource': 'Open Source',

        // Resume Page
        'nav.resume': '简历',
        'resume.role': '资深全栈工程师 & 区块链专家',
        'resume.intro': '拥有 12 年以上产业经验。10 年 Android、5 年 Flutter，并熟悉后端 (.NET/Go/Java/Node.js)、iOS、React Native 与 Unity 开发。',
        'resume.about': '关于我',
        'resume.exp': '工作经验',
        'resume.exp.total': '12+ 年总经验',
        'resume.exp.android': '10 年 Android 开发',
        'resume.exp.flutter': '5 年 Flutter 开发',
        'resume.exp.backend': '后端 (.NET/Go/Java/Node.js)',
        'resume.exp.other': 'iOS / React Native / Unity',
        'resume.exp.blockchain': '区块链经验自 2013',
        'resume.style': '工作风格',
        'resume.style.remote': '偏好远程工作',
        'resume.style.intl': '跨国合作经验 (柬埔寨、越南、日本、中国)',
        'resume.style.review': '代码审查 & 架构设计',
        'resume.lang': '语言能力',
        'resume.lang.cn': '中文 (母语)',
        'resume.lang.en': '英文 (可沟通)',
        'resume.lang.jp': '日文 (基础会话)',
        'resume.tech.android': 'Android 开发',
        'resume.tech.ios': 'iOS 开发',
        'resume.tech.blockchain': '区块链 & Solidity',
        'resume.tech.flutter': '跨平台开发 (Flutter)',
        'resume.tech.backend': '后端 & 其他'
    },

    'en': {
        // Navigation
        'nav.projects': 'Projects',
        'nav.skills': 'Skills',
        'nav.contact': 'Contact',

        // Hero Section
        'hero.badge': 'Full Stack Developer',
        'hero.title': 'Building Digital Products',
        'hero.title.highlight': 'That Matter',
        'hero.description': 'Full Stack Developer specializing in Flutter, React, and TypeScript. Passionate about building cross-platform applications and open source projects.',
        'hero.stat.projects': 'Open Source',
        'hero.stat.apps': 'Published Apps',
        'hero.stat.chains': 'Blockchains',

        // Projects Section
        'projects.title': 'Featured Projects',
        'projects.subtitle': 'Mobile Apps, Web Applications, Browser Extensions & Open Source',

        // Project: StickerAI
        'project.stickerai.title': 'StickerAI Studio',
        'project.stickerai.desc': 'New AI sticker generator! Upload a photo and Google Gemini AI automatically generates a complete LINE sticker pack. Maintains character consistency, supports multiple styles (Cutecore, Kawaii, Pixel Art, Watercolor, etc.), one-click download ZIP file compliant with LINE specifications.',

        // Project: Light Wallet
        'project.lightwallet.title': 'Light Wallet',
        'project.lightwallet.desc': 'Lightweight multi-chain crypto wallet supporting 43+ blockchains including Bitcoin, Ethereum, Solana, TON, Cosmos and more.',

        // Project: Crypto AI
        'project.cryptoai.title': 'Crypto AI Analysis',
        'project.cryptoai.desc': 'AI-powered cryptocurrency market analysis platform. Integrates Fear & Greed Index, Long/Short ratio, ETF flows and 5+ data sources.',

        // Project: Light Wallet Extension
        'project.extension.title': 'Light Wallet Extension',
        'project.extension.desc': 'Lightweight crypto wallet browser extension built with React + TypeScript, supporting EVM-compatible chains.',

        // Project: Insurance Pass
        'project.insurance.title': 'Insurance License Exam',
        'project.insurance.desc': 'Taiwan insurance license exam practice app covering life, property, and investment insurance. Features AI explanations and mock exams.',

        // Project: Taxi Pass
        'project.taxi.title': 'Taxi License Exam',
        'project.taxi.desc': 'Taiwan taxi driver license exam practice app with 236 questions on traffic laws and geography. Features AI assistant.',

        // Project: AutoStar
        'project.autostar.title': 'AutoStar Used Car Prices',
        'project.autostar.desc': 'Your used car price expert! Reveals real car prices, syncs Taiwan used car transaction prices in real-time, smart price estimation, and track favorite vehicles. Supports brand filtering, price comparison analysis, and real-time price notifications.',

        // Project: Safer Radar
        'project.saferradar.title': 'Safer Radar',
        'project.saferradar.desc': 'Real-time neighborhood safety alerts and crime risk map. Supports 12 languages, featuring risk heatmap analysis and incident reporting.',

        // Project: Hello World
        'project.helloworld.title': 'Multi-Language Hello World',
        'project.helloworld.desc': 'Hello World implementations in 60+ programming languages including compiled, interpreted, and functional paradigms.',

        // Project: TodoList
        'project.todolist.title': 'TodoList - 100+ Tech Stacks',
        'project.todolist.desc': '100+ implementations of the same Todo List app across Web, Mobile, Desktop, and game engines.',

        // Project: Lobster
        'project.lobster.title': 'Lobster - AI Agent Social',
        'project.lobster.desc': 'Third-party client for the Moltbook platform.',

        // Project: RentAHuman
        'project.rentahuman.title': 'RentAHuman: AI Hires Humans',
        'project.rentahuman.desc': 'AI agents hiring humans to complete tasks.',

        // Project: MoltX
        'project.moltx.title': 'MoltX: AI Agent Social Feed',
        'project.moltx.desc': 'Social feed platform for AI agents.',

        // Project: Intake
        'project.intake.title': 'Intake',
        'project.intake.desc': 'Create high-quality forms in Telegram.',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': 'Your portable AI agent built on OpenClaw.',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': 'Save X/Twitter posts & threads as structured notes.',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw AI Gateway',
        'project.clawhub.desc': 'A unified gateway for multiple AI models via a single API.',

        // Skills Section
        'skills.title': 'Tech Stack',
        'skills.subtitle': 'Specialized in cross-platform development and modern frontend technologies',
        'skills.mobile': 'Mobile',
        'skills.frontend': 'Frontend',
        'skills.backend': 'Backend & Cloud',
        'skills.blockchain': 'Blockchain',
        'skills.state': 'State Management',
        'skills.ai': 'AI Integration',

        // Services Section
        'nav.services': 'Services',
        'services.available': 'Available for Projects',
        'services.title': 'What I Can Build For You',
        'services.subtitle': 'From concept to launch, end-to-end delivery. Open to any industry — let\'s talk about your project.',
        'services.mobile.title': 'Mobile App Development',
        'services.mobile.desc': 'iOS / Android cross-platform apps powered by Flutter. Full lifecycle from development, publishing to monetization (IAP, Ads).',
        'services.web.title': 'Web / Full Stack',
        'services.web.desc': 'Frontend: React / Next.js / Vue. Backend: Go / Node.js / .NET Core / Java. True end-to-end delivery.',
        'services.blockchain.title': 'Blockchain / Web3',
        'services.blockchain.desc': 'Crypto wallets, DApps, smart contract integration. Supporting 43+ blockchains with multi-chain asset management.',
        'services.ai.title': 'AI Integration',
        'services.ai.desc': 'Integrate Gemini / OpenAI / Claude APIs into your product. AI chat, image generation, intelligent analysis, MCP Server development.',
        'services.desktop.title': 'Desktop App',
        'services.desktop.desc': 'Cross-platform desktop software with Tauri / Electron. macOS notarization, Windows, Linux \u2014 all in one build.',
        'services.consulting.title': 'Technical Consulting',
        'services.consulting.desc': 'Architecture design, code review, tech stack advice. Firebase / GA4 / CI/CD full-spectrum support.',
        'services.cta.title': 'Have a Project Idea? Let\'s Talk',
        'services.cta.desc': 'Whether it\'s a brand new project or extending an existing product, feel free to reach out anytime.',
        'services.cta.btn': 'Contact Me',

        // Contact Section
        'contact.title': 'Get In Touch',
        'contact.subtitle': 'Let\'s collaborate',

        // Footer
        'footer.copyright': '© 2025 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
        'platform.chrome': 'Chrome Extension',
        'platform.chrome': 'Chrome Extension',
        'platform.opensource': 'Open Source',

        // Resume Page
        'nav.resume': 'Resume',
        'resume.role': 'Senior Full Stack Developer & Blockchain Specialist',
        'resume.intro': '12+ years of industry experience. 10 years Android, 5 years Flutter. Experienced in backend (.NET/Go/Java/Node.js), iOS, React Native, and Unity development.',
        'resume.about': 'About Me',
        'resume.exp': 'Experience',
        'resume.exp.total': '12+ Years Total',
        'resume.exp.android': '10 Years Android Development',
        'resume.exp.flutter': '5 Years Flutter Development',
        'resume.exp.backend': 'Backend (.NET/Go/Java/Node.js)',
        'resume.exp.other': 'iOS / React Native / Unity',
        'resume.exp.blockchain': 'Blockchain since 2013',
        'resume.style': 'Work Style',
        'resume.style.remote': 'Remote Work Preferred',
        'resume.style.intl': 'International Collaboration (Cambodia, Vietnam, Japan, China)',
        'resume.style.review': 'Code Reviewer & Architecture Designer',
        'resume.lang': 'Languages',
        'resume.lang.cn': 'Chinese (Native)',
        'resume.lang.en': 'English (Communicative)',
        'resume.lang.jp': 'Japanese (Basic)',
        'resume.tech.android': 'Android Development',
        'resume.tech.ios': 'iOS Development',
        'resume.tech.blockchain': 'Blockchain & Solidity',
        'resume.tech.flutter': 'Cross-Platform (Flutter)',
        'resume.tech.backend': 'Backend & Other'
    },

    'ja': {
        // Navigation
        'nav.projects': 'プロジェクト',
        'nav.skills': 'スキル',
        'nav.contact': 'お問い合わせ',

        // Hero Section
        'hero.badge': 'Full Stack Developer',
        'hero.title': 'Building Digital Products',
        'hero.title.highlight': 'That Matter',
        'hero.description': 'Flutter、React、TypeScript を専門とするフルスタック開発者。クロスプラットフォームアプリとオープンソースプロジェクトの開発に情熱を注いでいます。',
        'hero.stat.projects': '公開プロジェクト',
        'hero.stat.apps': 'リリースアプリ',
        'hero.stat.chains': '対応ブロックチェーン',

        // Projects Section
        'projects.title': 'Featured Projects',
        'projects.subtitle': 'モバイルアプリ、Webアプリ、ブラウザ拡張機能、オープンソース',

        // Project: StickerAI
        'project.stickerai.title': 'StickerAI Studio',
        'project.stickerai.desc': '新しい AI スタンプジェネレーター！写真を1枚アップロードするだけで、Google Gemini AI が自動的に LINE スタンプパックを生成。キャラクターの一貫性を維持し、複数のスタイル（Cutecore、Kawaii、Pixel Art、Watercolor など）をサポート、LINE 規格に準拠した ZIP ファイルをワンクリックでダウンロード。',

        // Project: Light Wallet
        'project.lightwallet.title': 'Light Wallet',
        'project.lightwallet.desc': 'Bitcoin、Ethereum、Solana、TON、Cosmos など 43+ ブロックチェーン対応の軽量マルチチェーン暗号通貨ウォレット。',

        // Project: Crypto AI
        'project.cryptoai.title': '暗号 AI 分析',
        'project.cryptoai.desc': 'AI 駆動の暗号通貨市場分析プラットフォーム。Fear & Greed 指数、ロング/ショート比率、ETF フローなど 5+ データソースを統合。',

        // Project: Light Wallet Extension
        'project.extension.title': 'Light Wallet Extension',
        'project.extension.desc': 'React + TypeScript で開発された軽量暗号通貨ウォレットブラウザ拡張機能。EVM 互換チェーン対応。',

        // Project: Insurance Pass
        'project.insurance.title': '保険資格試験問題集',
        'project.insurance.desc': '台湾保険資格試験練習アプリ。生命保険、損害保険、投資型保険をカバー。AI 解説、クラウド同期、模擬試験対応。',

        // Project: Taxi Pass
        'project.taxi.title': 'タクシー運転免許模擬試験',
        'project.taxi.desc': '台湾タクシー運転免許試験練習アプリ。交通法規と地理に関する 236 問を収録。AI アシスタント機能付き。',

        // Project: AutoStar
        'project.autostar.title': 'AutoStar 中古車価格登録',
        'project.autostar.desc': 'あなたの中古車価格検索の専門家！実際の車価を公開し、台湾全土の中古車取引価格をリアルタイムで同期、スマート価格見積もり、お気に入りの車両を追跡。ブランドフィルタリング、価格比較分析、リアルタイム価格通知をサポート。',

        // Project: Safer Radar
        'project.saferradar.title': 'Safer Radar - 安心レーダー',
        'project.saferradar.desc': 'リアルタイムの治安通知と犯罪リスクマップを提供するコミュニティ安全アプリ。12言語対応、リスクヒートマップ分析と事件報告機能を搭載。',

        // Project: Hello World
        'project.helloworld.title': 'Multi-Language Hello World',
        'project.helloworld.desc': '60+ プログラミング言語の Hello World 実装集。コンパイル型、インタプリタ型、関数型などを網羅。自動テストスクリプト付き。',

        // Project: TodoList
        'project.todolist.title': 'TodoList - 100+ 技術スタック',
        'project.todolist.desc': '同じ Todo List アプリの 100+ 種類の実装。Web、Mobile、Desktop、ゲームエンジンなど完全な学習リソース。',

        // Protect: Lobster
        'project.lobster.title': 'Lobster - AI Agent Social',
        'project.lobster.desc': 'Moltbookプラットフォームのサードパーティクライアント。',

        // Project: RentAHuman
        'project.rentahuman.title': 'RentAHuman: AI Hires Humans',
        'project.rentahuman.desc': 'AIエージェントが人間にタスクを依頼します。',

        // Project: MoltX
        'project.moltx.title': 'MoltX: AI Agent Social Feed',
        'project.moltx.desc': 'AIエージェント向けのソーシャルフィードプラットフォーム。',

        // Project: Intake
        'project.intake.title': 'Intake',
        'project.intake.desc': 'Telegramで高品質なフォームを作成。',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': 'OpenClawベースのポータブルAIエージェント。',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': 'X/Twitterの投稿を構造化されたノートとして保存。',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw AI Gateway',
        'project.clawhub.desc': '単一APIで複数のAIモデルを統合するゲートウェイ。',

        // Skills Section
        'skills.title': 'Tech Stack',
        'skills.subtitle': 'クロスプラットフォーム開発と最新フロントエンド技術を専門',
        'skills.mobile': 'Mobile',
        'skills.frontend': 'Frontend',
        'skills.backend': 'Backend & Cloud',
        'skills.blockchain': 'Blockchain',
        'skills.state': 'State Management',
        'skills.ai': 'AI Integration',

        // Services Section
        'nav.services': 'サービス',
        'services.available': 'プロジェクト受付中',
        'services.title': 'あなたのために作れるもの',
        'services.subtitle': '企画からリリースまでワンストップで対応。業界問わず、お気軽にご相談ください。',
        'services.mobile.title': 'モバイルアプリ開発',
        'services.mobile.desc': 'Flutter を軸にした iOS / Android クロスプラットフォーム開発。開発から公開、収益化（IAP・広告）までワンストップ。',
        'services.web.title': 'Web / フルスタック開発',
        'services.web.desc': 'フロント: React / Next.js / Vue、バックエンド: Go / Node.js / .NET Core / Java。フルスタック一括対応。',
        'services.blockchain.title': 'ブロックチェーン / Web3',
        'services.blockchain.desc': 'ウォレット、DApp、スマートコントラクト統合。43+ チェーン対応のマルチチェーン資産管理。',
        'services.ai.title': 'AI インテグレーション',
        'services.ai.desc': 'Gemini / OpenAI / Claude API をプロダクトに統合。AI チャット、画像生成、インテリジェント分析、MCP Server 開発。',
        'services.desktop.title': 'デスクトップアプリ',
        'services.desktop.desc': 'Tauri / Electron クロスプラットフォーム。macOS 公証署名、Windows、Linux 一括対応。',
        'services.consulting.title': '技術コンサルティング',
        'services.consulting.desc': 'アーキテクチャ設計、コードレビュー、技術スタック選定。Firebase / GA4 / CI/CD フルサポート。',
        'services.cta.title': 'プロジェクトのアイデアがありますか？',
        'services.cta.desc': '新規プロジェクトでも既存製品の機能拡張でも、お気軽にお問い合わせください。',
        'services.cta.btn': 'お問い合わせ',

        // Contact Section
        'contact.title': 'Get In Touch',
        'contact.subtitle': 'お気軽にご連絡ください',

        // Footer
        'footer.copyright': '© 2025 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
        'platform.chrome': 'Chrome Extension',
        'platform.chrome': 'Chrome Extension',
        'platform.opensource': 'Open Source',

        // Resume Page
        'nav.resume': '履歴書',
        'resume.role': 'シニアフルスタックエンジニア & ブロックチェーン専門家',
        'resume.intro': '業界経験12年以上。Android 10年、Flutter 5年。バックエンド (.NET/Go/Java/Node.js)、iOS、React Native、Unity 開發にも精通。',
        'resume.about': '自己紹介',
        'resume.exp': '職務経験',
        'resume.exp.total': '総経験 12年以上',
        'resume.exp.android': 'Android 開發 10年',
        'resume.exp.flutter': 'Flutter 開發 5年',
        'resume.exp.backend': 'バックエンド (.NET/Go/Java/Node.js)',
        'resume.exp.other': 'iOS / React Native / Unity',
        'resume.exp.blockchain': 'ブロックチェーン 2013年〜',
        'resume.style': 'ワークスタイル',
        'resume.style.remote': 'リモートワーク希望',
        'resume.style.intl': '国際協業経験 (カンボジア、ベトナム、日本、中国)',
        'resume.style.review': 'コードレビュー & アーキテクチャ設計',
        'resume.lang': '語学',
        'resume.lang.cn': '中国語 (ネイティブ)',
        'resume.lang.en': '英語 (日常会話)',
        'resume.lang.jp': '日本語 (少し話せます)',
        'resume.tech.android': 'Android 開發',
        'resume.tech.ios': 'iOS 開発',
        'resume.tech.blockchain': 'ブロックチェーン & Solidity',
        'resume.tech.flutter': 'クロスプラットフォーム (Flutter)',
        'resume.tech.backend': 'バックエンド & その他'
    }
};

// Language display names
const languageNames = {
    'zh-TW': '繁體中文',
    'zh-CN': '简体中文',
    'en': 'English',
    'ja': '日本語'
};

// Language flags/icons
const languageFlags = {
    'zh-TW': '🇹🇼',
    'zh-CN': '🇨🇳',
    'en': '🇺🇸',
    'ja': '🇯🇵'
};

// Get browser language or saved preference
function getPreferredLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('preferredLanguage');
    if (saved && translations[saved]) {
        return saved;
    }

    // Check browser language
    const browserLang = navigator.language || navigator.userLanguage;

    if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-Hant')) {
        return 'zh-TW';
    } else if (browserLang.startsWith('zh-CN') || browserLang.startsWith('zh-Hans') || browserLang.startsWith('zh')) {
        return 'zh-CN';
    } else if (browserLang.startsWith('ja')) {
        return 'ja';
    } else {
        return 'en';
    }
}

// Current language
let currentLanguage = getPreferredLanguage();

// Translate a key
function t(key) {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);

        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage === 'zh-CN' ? 'zh-CN' :
        currentLanguage === 'ja' ? 'ja' :
            currentLanguage === 'en' ? 'en' : 'zh-TW';

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descriptions = {
            'zh-TW': 'ImL1s - 台灣全端開發者。專精 Flutter、React、TypeScript 跨平台應用開發。9+ 開源專案、5 款上架應用、支援 43+ 區塊鏈。',
            'zh-CN': 'ImL1s - 台湾全栈开发者。专精 Flutter、React、TypeScript 跨平台应用开发。9+ 开源项目、5 款上架应用、支持 43+ 区块链。',
            'en': 'ImL1s - Full Stack Developer from Taiwan. Specializing in Flutter, React, TypeScript cross-platform development. 9+ open source projects, 5 published apps, 43+ blockchain support.',
            'ja': 'ImL1s - 台湾のフルスタック開発者。Flutter、React、TypeScript クロスプラットフォーム開発専門。9+ オープンソースプロジェクト、5 リリースアプリ、43+ ブロックチェーン対応。'
        };
        metaDesc.content = descriptions[currentLanguage] || descriptions['en'];
    }

    // Update language switcher button text
    const langBtn = document.querySelector('.lang-btn-text');
    if (langBtn) {
        langBtn.textContent = languageFlags[currentLanguage] + ' ' + languageNames[currentLanguage];
    }
}

// Change language
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        applyTranslations();

        // Close dropdown
        const dropdown = document.querySelector('.lang-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
}

// Toggle language dropdown
function toggleLanguageDropdown() {
    const dropdown = document.querySelector('.lang-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-switcher')) {
            const dropdown = document.querySelector('.lang-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
    });
});
