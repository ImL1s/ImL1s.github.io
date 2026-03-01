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

        // Project: ChartWise
        'project.cryptoai.title': 'ChartWise – 市場研究',
        'project.cryptoai.desc': 'AI 驅動的加密貨幣與股票圖表分析平台。支援 355+ 交易標的即時數據，整合恐懼貪婪指數、多空比、ETF 資金流等多維數據源，提供 AI 智能圖表分析。',

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
        'project.intake.desc': 'AI 食物掃描與熱量追蹤，輕鬆記錄每日飲食與營養攝取。',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': '基於 OpenClaw 構建的隨身 AI 代理人',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': '將 X/Twitter 貼文儲存為結構化筆記',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw Dashboard',
        'project.clawhub.desc': 'OpenClaw AI Gateway 的行動管理面板 — 掃 QR Code 即可即時監控、聊天、管理排程與用量分析。',

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
        'footer.copyright': '\u00A9 2026 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
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
        'resume.tech.backend': '後端 & 其他',

        // Resume Page - Core Keys
        'resume.hero.title': '資深行動開發工程師 | Android・Flutter・Blockchain',
        'resume.hero.remote': '偏好遠端工作',
        'resume.hero.edu': '中國科技大學',
        'resume.hero.summary': '資深行動開發工程師，13+ 年產業經驗，10+ 年 Android 原生開發。精通 Flutter 跨平台開發與後端架構，自 2013 年起深耕區塊鏈領域（幣圈/鏈圈/礦圈）。擅長架構設計與跨國團隊協作，經常擔任 Code Reviewer 角色。獨立完成多鏈區塊鏈交互開發，支援 43+ 區塊鏈。長期與柬埔寨、越南、日本的工程師與設計師遠端合作。',
        'resume.stat.years': '年經驗',
        'resume.stat.chains': '支援區塊鏈',
        'resume.stat.apps': '上架應用',
        'resume.stat.countries': '跨國協作',
        'resume.exp.title': '工作經歷',
        'resume.exp.tb.role': 'Android 技術負責人',
        'resume.exp.tb.desc': '託管 + 自託管混合錢包 Android 專案技術負責人，負責整體架構設計、核心功能開發與 Code Review。',
        'resume.exp.tb.h1': '架構設計與技術決策，MVVM + Jetpack Compose 現代化 UI，託管與自託管雙模式錢包',
        'resume.exp.tb.h2': 'RxKotlin + Retrofit 響應式網路請求，Dagger2 依賴注入',
        'resume.exp.tb.h3': '擔任 Code Reviewer，制定開發規範與最佳實踐',
        'resume.exp.tb.h4': '建立 CI/CD 自動化流程，優化應用性能與穩定性',
        'resume.exp.ws.role': '全端開發工程師',
        'resume.exp.ws.desc': '去中心化/中心化混合錢包，類似 OKX 架構。支援 USDt 充值、租車等多元服務整合。',
        'resume.exp.ws.h1': '開發去中心化 + 中心化混合錢包架構',
        'resume.exp.ws.h2': '整合 USDt 支付、租車等多元生活服務',
        'resume.exp.ws.h3': '跨國團隊協作，多語言支援',
        'resume.exp.heytok.role': 'Flutter 技術負責人 & DevOps',
        'resume.exp.heytok.desc': '跨平台即時通訊 + 中心化加密貨幣錢包應用技術負責人。Melos 多模組 monorepo 架構，支援 iOS/Android/macOS/Windows 四平台。',
        'resume.exp.heytok.h1': 'Melos 多模組架構（chat、contact、wallet 等 8+ 業務模組），抽象路由跨模組通訊',
        'resume.exp.heytok.h2': 'Riverpod 狀態管理 + Dio/Retrofit 網路層 + Floor SQLite 離線存儲',
        'resume.exp.heytok.h3': 'Agora RTC 即時音視頻整合，WebSocket 實時聊天',
        'resume.exp.heytok.h4': 'iOS 公證自動化，搭建 CI/CD 自動打包發布系統',
        'resume.exp.bbsport.role': 'Android 開發工程師',
        'resume.exp.bbsport.desc': '多品牌體育應用 Android 開發，模組化架構設計。11 個業務模組 + 共享庫，支援多渠道多包版本構建。',
        'resume.exp.bbsport.h1': 'AppJoint 組件化架構，11 個業務模組隔離（首頁、體育、訂單、用戶、支付等）',
        'resume.exp.bbsport.h2': 'MVVM + DataBinding，RxKotlin + Coroutines 混合異步處理',
        'resume.exp.bbsport.h3': '雙日誌系統（Alibaba Cloud SLS + Tencent Cloud CLS），多渠道打包（Walle）',
        'resume.exp.bbsport.h4': '集成客服 SDK（imchat）、推送（JPush/EngageLab）、驗證（GEETEST）',
        'resume.exp.jump.role': 'Android 開發工程師',
        'resume.exp.jump.desc': '少年 Jump+ 漫畫閱讀 Android 應用開發，高性能列表渲染、複雜 UI 交互與即時內容更新。',
        'resume.exp.jump.h1': 'RecyclerView 高性能漫畫列表實現，支援複雜資料結構與動態更新',
        'resume.exp.jump.h2': 'MVVM 架構，RxKotlin 處理複雜異步邏輯',
        'resume.exp.jump.h3': '數據緩存機制，優化列表性能（ViewHolder 重用、DiffUtil）',
        'resume.exp.mars.role': 'Mobile 開發 (Android/iOS/Flutter)',
        'resume.exp.mars.desc': '中心化錢包，包含金融功能、DApp 瀏覽器、閃兌等，使用 Flutter 混合開發提升效率。',
        'resume.exp.mars.h1': 'Android + iOS + Flutter 三端混合開發',
        'resume.exp.mars.h2': 'DApp 瀏覽器、閃兌功能開發',
        'resume.exp.mars.h3': 'Flutter Embed 混合架構，共享業務邏輯',
        'resume.exp.lottery.title': '彩票平台',
        'resume.exp.lottery.role': 'Android 開發工程師',
        'resume.exp.lottery.desc': '彩票平台 Android 應用開發，負責核心業務模組與即時開獎功能實現。',
        'resume.exp.lottery.h1': '彩票購買、即時開獎、歷史記錄等核心功能開發',
        'resume.exp.lottery.h2': '高併發即時推播，Socket 實時數據更新',
        'resume.exp.lottery.h3': '複雜 UI 交互與動畫效果實現',
        'resume.exp.early.title': '早期專案經歷',
        'resume.exp.early.role': 'Android / 後端開發',
        'resume.exp.early.desc': 'Unity AR 工具開發（UI Inject）、RPG 遊戲 Socket Server 開發等。自 2013 年起進入區塊鏈領域，深度參與 DeFi 與 GameFi 生態。',
        'resume.projects.title': '代表性專案',
        'resume.proj.wallet.desc': '支援 43+ 區塊鏈的去中心化非託管錢包。HD 錢包（BIP-32/44）、AES-256-GCM 加密、DApp 瀏覽器、DeFi 功能。190+ 頁面、125+ UI 組件。支援 Ledger/Keystone/Trezor 硬體錢包。',
        'resume.proj.wear.desc': '全球首款 Wear OS + Apple Watch 穿戴裝置區塊鏈錢包。Kotlin Multiplatform 跨平台、Keystone 硬體錢包離線簽名、Gemini AI 語音命令交易。支援 22 條鏈。',
        'resume.proj.walletgo.desc': '企業級中心化錢包後端。Go 語言高性能服務、HD 錢包地址池（900 預生成地址）、三層冷存儲架構、PostgreSQL RLS、API 響應 < 200ms、99.9% uptime。',
        'resume.proj.dartweb3.desc': '純 Dart Web3 SDK，模組化架構、無原生依賴（不需 FFI/C++/Rust bindings），可在所有 Dart/Flutter 平台使用。提供 EVM 核心，延伸支援 Solana / Polkadot / Tron / TON / Bitcoin。',
        'resume.proj.solidity.desc': 'ERC-20/721 代幣合約、Staking Pool 質押池、DeFi 借貸協議、Mint & Repay 機制。使用 OpenZeppelin 標準庫、Hardhat 測試部署、Gas 優化。',
        'resume.proj.stickerai.desc': 'AI 貼圖生成器。上傳照片，Google Gemini AI 自動生成 LINE 貼圖包。保持角色一致性，支援多種風格，一鍵下載 LINE 規範 ZIP 檔。已上架 App Store & Google Play。',
        'resume.tech.title': '技術棧',
        'resume.tech.ai': 'AI & 其他',
        'resume.info.title': '學歷 & 語言',
        'resume.info.edu': '學歷',
        'resume.info.edu.school': '中國科技大學',
        'resume.info.lang': '語言能力',
        'resume.info.lang.cn': '中文 - 母語',
        'resume.info.lang.en': '英文 - 可溝通（技術文件讀寫、Code Review、國際會議）',
        'resume.info.lang.jp': '日文 - 基礎會話（少し話せます）',
        'resume.info.style': '工作風格',
        'resume.info.style.remote': '偏好遠端工作，擅長異步協作',
        'resume.info.style.intl': '跨國團隊：柬埔寨、越南、日本',
        'resume.info.style.review': 'Code Reviewer & 架構設計師',
        'resume.info.style.drive': '自我驅動，能獨立完成複雜專案',
        'resume.print': '列印 / PDF',

        // Resume - New Project Keys
        'resume.filter.all': '全部',
        'resume.filter.oss': '開源',
        'resume.proj.ordinals.desc': '比特幣 Ordinals、BRC-20 代幣與銘文管理的 Dart SDK。支援 PSBT 建構、銘文交易、純 Dart 實作跨平台。',
        'resume.proj.monero.desc': '純 Kotlin Multiplatform + Dart 實作的高效能 Monero 錢包函式庫。無需 C++ bindings，原生支援 Android、iOS、Desktop。',
        'resume.proj.swap.desc': '產品級多鏈交換聚合器。統一介面整合 20+ 供應商（1inch、Jupiter、Odos 等），支援 EVM、Solana、Bitcoin、Cosmos 鏈。',
        'resume.proj.imchat.desc': '企業級客服 SDK，為第三方應用提供實時客服聊天。WebSocket 長連接自動重連、訊息加密傳輸、29+ 業務資料模型、Room 離線存儲。支援 15+ 語言，Maven 發布。',
        'resume.proj.chartwise.desc': 'AI 驅動的加密貨幣與股票圖表分析平台。支援 355+ 交易標的即時數據，整合恐懼貪婪指數、多空比、ETF 資金流等多維數據源。',
        'resume.proj.yieldora.desc': 'ML 驅動的 Bitfinex 加密貨幣借貸機器人。6 種智能策略自動優化利率，結合多租戶 SaaS 平台。Flutter App 即時收益監控。',
        'resume.proj.flashclaw.desc': '基於 OpenClaw 構建的隨身 AI 代理人。零設定即刻使用，支援多模型切換、視覺分析、隱私優先設計。',
        'resume.proj.clawhub.desc': 'OpenClaw AI Gateway 行動管理面板。掃 QR Code 即時監控、聊天、管理排程與用量分析。支援 WebSocket 即時通訊。',
        'resume.proj.lobster.desc': 'Moltbook AI 代理人社交網絡客戶端。瀏覽 AI 生成內容、管理個人 AI 代理人、觀察代理人自主互動。支援訂閱與多模型管理。',
        'resume.proj.rentahuman.desc': 'AI 代理人僱用真人完成任務的媒合平台。反轉典型的人機關係，支援 11 種語言、即時通訊、安全預約系統。',
        'resume.proj.carlog.desc': '台灣專用車輛管理 App。油耗記錄、保養提醒、油耗效率分析，整合台灣監理站驗車日期、違規紀錄、燃料稅狀態與中油即時油價。',
        'resume.proj.kashvox.desc': 'AI 語音記帳 App。語音輸入智能辨識消費、發票掃描、智能分析月度支出趨勢。',
        'resume.proj.extension.desc': '輕量級加密貨幣錢包瀏覽器擴充功能，使用 React + TypeScript 開發，支援 EVM 相容鏈。',
        'resume.proj.flux.desc': '輕量級 Flutter Server-Driven UI 腳本引擎。自訂 .flux 語言編譯為位元組碼，VM 安全執行動態 UI 更新，無需重新上架。含 7 個套件：編譯器、VM、CLI、LSP、VSCode 擴充。',
        'resume.proj.termuxide.desc': '在 Android Termux 上的完整 Flutter 開發環境。支援 100+ 語言語法高亮、多檔案分頁、終端機整合、SSH 連線。',
        'resume.proj.helloworld.desc': '60+ 程式語言的 Hello World 實作集合，涵蓋編譯型、直譯型、函數式等類別。附自動測試腳本。',
        'resume.proj.todolist.desc': '同一個 Todo List 應用的 100+ 種實現。涵蓋 Web、Mobile、Desktop、遊戲引擎等完整學習資源。',
        'resume.proj.screeninu.desc': '跨平台桌面截圖 OCR 工具。Rust + Tauri 高效能、多引擎 OCR（Windows OCR + Tesseract 5）、全域快捷鍵、歷史紀錄、自動複製剪貼簿。',
        'resume.proj.xmrig.desc': '跨平台 Monero/Wownero/DERO 挖礦應用。支援 6 平台（Android、iOS、Web、Desktop、WearOS、watchOS），即時算力監控、多礦池支援。',
        'resume.proj.mahjong.desc': '跨平台線上遊戲：台灣 16 張麻將 + 德州撲克。Flutter + Rust 實作，完整遊戲流程、胡牌偵測、計分、Bot AI。'
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

        // Project: ChartWise
        'project.cryptoai.title': 'ChartWise – 市场研究',
        'project.cryptoai.desc': 'AI 驱动的加密货币与股票图表分析平台。支持 355+ 交易标的即时数据，整合恐惧贪婪指数、多空比、ETF 资金流等多维数据源，提供 AI 智能图表分析。',

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
        'project.intake.desc': 'AI 食物扫描与热量追踪，轻松记录每日饮食与营养摄取。',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': '基于 OpenClaw 构建的随身 AI 代理人',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': '将 X/Twitter 帖子保存为结构化笔记',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw Dashboard',
        'project.clawhub.desc': 'OpenClaw AI Gateway 的移动管理面板 — 扫 QR Code 即可实时监控、聊天、管理排程与用量分析。',

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
        'footer.copyright': '\u00A9 2026 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
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
        'resume.tech.backend': '后端 & 其他',

        // Resume Page - Core Keys
        'resume.hero.title': '资深移动开发工程师 | Android・Flutter・Blockchain',
        'resume.hero.remote': '偏好远程工作',
        'resume.hero.edu': '中国科技大学',
        'resume.hero.summary': '资深移动开发工程师，13+ 年产业经验，10+ 年 Android 原生开发。精通 Flutter 跨平台开发与后端架构，自 2013 年起深耕区块链领域（币圈/链圈/矿圈）。擅长架构设计与跨国团队协作，经常担任 Code Reviewer 角色。独立完成多链区块链交互开发，支持 43+ 区块链。长期与柬埔寨、越南、日本的工程师与设计师远程合作。',
        'resume.stat.years': '年经验',
        'resume.stat.chains': '支持区块链',
        'resume.stat.apps': '上架应用',
        'resume.stat.countries': '跨国协作',
        'resume.exp.title': '工作经历',
        'resume.exp.tb.role': 'Android 技术负责人',
        'resume.exp.tb.desc': '托管 + 自托管混合钱包 Android 项目技术负责人，负责整体架构设计、核心功能开发与 Code Review。',
        'resume.exp.tb.h1': '架构设计与技术决策，MVVM + Jetpack Compose 现代化 UI，托管与自托管双模式钱包',
        'resume.exp.tb.h2': 'RxKotlin + Retrofit 响应式网络请求，Dagger2 依赖注入',
        'resume.exp.tb.h3': '担任 Code Reviewer，制定开发规范与最佳实践',
        'resume.exp.tb.h4': '建立 CI/CD 自动化流程，优化应用性能与稳定性',
        'resume.exp.ws.role': '全栈开发工程师',
        'resume.exp.ws.desc': '去中心化/中心化混合钱包，类似 OKX 架构。支持 USDt 充值、租车等多元服务整合。',
        'resume.exp.ws.h1': '开发去中心化 + 中心化混合钱包架构',
        'resume.exp.ws.h2': '整合 USDt 支付、租车等多元生活服务',
        'resume.exp.ws.h3': '跨国团队协作，多语言支持',
        'resume.exp.heytok.role': 'Flutter 技术负责人 & DevOps',
        'resume.exp.heytok.desc': '跨平台即时通讯 + 中心化加密货币钱包应用技术负责人。Melos 多模块 monorepo 架构，支持 iOS/Android/macOS/Windows 四平台。',
        'resume.exp.heytok.h1': 'Melos 多模块架构（chat、contact、wallet 等 8+ 业务模块），抽象路由跨模块通讯',
        'resume.exp.heytok.h2': 'Riverpod 状态管理 + Dio/Retrofit 网络层 + Floor SQLite 离线存储',
        'resume.exp.heytok.h3': 'Agora RTC 即时音视频整合，WebSocket 实时聊天',
        'resume.exp.heytok.h4': 'iOS 公证自动化，搭建 CI/CD 自动打包发布系统',
        'resume.exp.bbsport.role': 'Android 开发工程师',
        'resume.exp.bbsport.desc': '多品牌体育应用 Android 开发，模块化架构设计。11 个业务模块 + 共享库，支持多渠道多包版本构建。',
        'resume.exp.bbsport.h1': 'AppJoint 组件化架构，11 个业务模块隔离（首页、体育、订单、用户、支付等）',
        'resume.exp.bbsport.h2': 'MVVM + DataBinding，RxKotlin + Coroutines 混合异步处理',
        'resume.exp.bbsport.h3': '双日志系统（Alibaba Cloud SLS + Tencent Cloud CLS），多渠道打包（Walle）',
        'resume.exp.bbsport.h4': '集成客服 SDK（imchat）、推送（JPush/EngageLab）、验证（GEETEST）',
        'resume.exp.jump.role': 'Android 开发工程师',
        'resume.exp.jump.desc': '少年 Jump+ 漫画阅读 Android 应用开发，高性能列表渲染、复杂 UI 交互与即时内容更新。',
        'resume.exp.jump.h1': 'RecyclerView 高性能漫画列表实现，支持复杂数据结构与动态更新',
        'resume.exp.jump.h2': 'MVVM 架构，RxKotlin 处理复杂异步逻辑',
        'resume.exp.jump.h3': '数据缓存机制，优化列表性能（ViewHolder 重用、DiffUtil）',
        'resume.exp.mars.role': 'Mobile 开发 (Android/iOS/Flutter)',
        'resume.exp.mars.desc': '中心化钱包，包含金融功能、DApp 浏览器、闪兑等，使用 Flutter 混合开发提升效率。',
        'resume.exp.mars.h1': 'Android + iOS + Flutter 三端混合开发',
        'resume.exp.mars.h2': 'DApp 浏览器、闪兑功能开发',
        'resume.exp.mars.h3': 'Flutter Embed 混合架构，共享业务逻辑',
        'resume.exp.lottery.title': '彩票平台',
        'resume.exp.lottery.role': 'Android 开发工程师',
        'resume.exp.lottery.desc': '彩票平台 Android 应用开发，负责核心业务模块与即时开奖功能实现。',
        'resume.exp.lottery.h1': '彩票购买、即时开奖、历史记录等核心功能开发',
        'resume.exp.lottery.h2': '高并发即时推播，Socket 实时数据更新',
        'resume.exp.lottery.h3': '复杂 UI 交互与动画效果实现',
        'resume.exp.early.title': '早期项目经历',
        'resume.exp.early.role': 'Android / 后端开发',
        'resume.exp.early.desc': 'Unity AR 工具开发（UI Inject）、RPG 游戏 Socket Server 开发等。自 2013 年起进入区块链领域，深度参与 DeFi 与 GameFi 生态。',
        'resume.projects.title': '代表性项目',
        'resume.proj.wallet.desc': '支持 43+ 区块链的去中心化非托管钱包。HD 钱包（BIP-32/44）、AES-256-GCM 加密、DApp 浏览器、DeFi 功能。190+ 页面、125+ UI 组件。支持 Ledger/Keystone/Trezor 硬件钱包。',
        'resume.proj.wear.desc': '全球首款 Wear OS + Apple Watch 穿戴设备区块链钱包。Kotlin Multiplatform 跨平台、Keystone 硬件钱包离线签名、Gemini AI 语音命令交易。支持 22 条链。',
        'resume.proj.walletgo.desc': '企业级中心化钱包后端。Go 语言高性能服务、HD 钱包地址池（900 预生成地址）、三层冷存储架构、PostgreSQL RLS、API 响应 < 200ms、99.9% uptime。',
        'resume.proj.dartweb3.desc': '纯 Dart Web3 SDK，模块化架构、无原生依赖（不需 FFI/C++/Rust bindings），可在所有 Dart/Flutter 平台使用。提供 EVM 核心，延伸支持 Solana / Polkadot / Tron / TON / Bitcoin。',
        'resume.proj.solidity.desc': 'ERC-20/721 代币合约、Staking Pool 质押池、DeFi 借贷协议、Mint & Repay 机制。使用 OpenZeppelin 标准库、Hardhat 测试部署、Gas 优化。',
        'resume.proj.stickerai.desc': 'AI 贴图生成器。上传照片，Google Gemini AI 自动生成 LINE 贴图包。保持角色一致性，支持多种风格，一键下载 LINE 规范 ZIP 档。已上架 App Store & Google Play。',
        'resume.tech.title': '技术栈',
        'resume.tech.ai': 'AI & 其他',
        'resume.info.title': '学历 & 语言',
        'resume.info.edu': '学历',
        'resume.info.edu.school': '中国科技大学',
        'resume.info.lang': '语言能力',
        'resume.info.lang.cn': '中文 - 母语',
        'resume.info.lang.en': '英文 - 可沟通（技术文档读写、Code Review、国际会议）',
        'resume.info.lang.jp': '日文 - 基础会话（少し話せます）',
        'resume.info.style': '工作风格',
        'resume.info.style.remote': '偏好远程工作，擅长异步协作',
        'resume.info.style.intl': '跨国团队：柬埔寨、越南、日本',
        'resume.info.style.review': 'Code Reviewer & 架构设计师',
        'resume.info.style.drive': '自我驱动，能独立完成复杂项目',
        'resume.print': '打印 / PDF',

        // Resume - New Project Keys
        'resume.filter.all': '全部',
        'resume.filter.oss': '开源',
        'resume.proj.ordinals.desc': '比特币 Ordinals、BRC-20 代币与铭文管理的 Dart SDK。支持 PSBT 构建、铭文交易、纯 Dart 实现跨平台。',
        'resume.proj.monero.desc': '纯 Kotlin Multiplatform + Dart 实现的高性能 Monero 钱包库。无需 C++ bindings，原生支持 Android、iOS、Desktop。',
        'resume.proj.swap.desc': '产品级多链交换聚合器。统一接口整合 20+ 供应商（1inch、Jupiter、Odos 等），支持 EVM、Solana、Bitcoin、Cosmos 链。',
        'resume.proj.imchat.desc': '企业级客服 SDK，为第三方应用提供实时客服聊天。WebSocket 长连接自动重连、消息加密传输、29+ 业务数据模型、Room 离线存储。支持 15+ 语言，Maven 发布。',
        'resume.proj.chartwise.desc': 'AI 驱动的加密货币与股票图表分析平台。支持 355+ 交易标的即时数据，整合恐惧贪婪指数、多空比、ETF 资金流等多维数据源。',
        'resume.proj.yieldora.desc': 'ML 驱动的 Bitfinex 加密货币借贷机器人。6 种智能策略自动优化利率，结合多租户 SaaS 平台。Flutter App 即时收益监控。',
        'resume.proj.flashclaw.desc': '基于 OpenClaw 构建的随身 AI 代理人。零设置即刻使用，支持多模型切换、视觉分析、隐私优先设计。',
        'resume.proj.clawhub.desc': 'OpenClaw AI Gateway 移动管理面板。扫 QR Code 即时监控、聊天、管理排程与用量分析。支持 WebSocket 即时通讯。',
        'resume.proj.lobster.desc': 'Moltbook AI 代理人社交网络客户端。浏览 AI 生成内容、管理个人 AI 代理人、观察代理人自主互动。支持订阅与多模型管理。',
        'resume.proj.rentahuman.desc': 'AI 代理人雇用真人完成任务的撮合平台。反转典型的人机关系，支持 11 种语言、即时通讯、安全预约系统。',
        'resume.proj.carlog.desc': '台湾专用车辆管理 App。油耗记录、保养提醒、油耗效率分析，整合台湾监理站验车日期、违规记录、燃料税状态与中油即时油价。',
        'resume.proj.kashvox.desc': 'AI 语音记账 App。语音输入智能识别消费、发票扫描、智能分析月度支出趋势。',
        'resume.proj.extension.desc': '轻量级加密货币钱包浏览器扩展功能，使用 React + TypeScript 开发，支持 EVM 兼容链。',
        'resume.proj.flux.desc': '轻量级 Flutter Server-Driven UI 脚本引擎。自定 .flux 语言编译为字节码，VM 安全执行动态 UI 更新，无需重新上架。含 7 个包：编译器、VM、CLI、LSP、VSCode 扩展。',
        'resume.proj.termuxide.desc': '在 Android Termux 上的完整 Flutter 开发环境。支持 100+ 语言语法高亮、多文件标签页、终端集成、SSH 连接。',
        'resume.proj.helloworld.desc': '60+ 编程语言的 Hello World 实现集合，涵盖编译型、解释型、函数式等类别。附自动测试脚本。',
        'resume.proj.todolist.desc': '同一个 Todo List 应用的 100+ 种实现。涵盖 Web、Mobile、Desktop、游戏引擎等完整学习资源。',
        'resume.proj.screeninu.desc': '跨平台桌面截图 OCR 工具。Rust + Tauri 高性能、多引擎 OCR（Windows OCR + Tesseract 5）、全局快捷键、历史记录、自动复制剪贴板。',
        'resume.proj.xmrig.desc': '跨平台 Monero/Wownero/DERO 挖矿应用。支持 6 平台（Android、iOS、Web、Desktop、WearOS、watchOS），即时算力监控、多矿池支持。',
        'resume.proj.mahjong.desc': '跨平台线上游戏：台湾 16 张麻将 + 德州扑克。Flutter + Rust 实现，完整游戏流程、胡牌检测、计分、Bot AI。'
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

        // Project: ChartWise
        'project.cryptoai.title': 'ChartWise – Market Research',
        'project.cryptoai.desc': 'AI-powered crypto & stock chart analysis platform. Real-time data for 355+ symbols, integrating Fear & Greed Index, Long/Short ratio, ETF flows and more.',

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
        'project.intake.desc': 'AI food scanner & calorie tracker. Effortlessly log daily meals and nutrition intake.',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': 'Your portable AI agent built on OpenClaw.',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': 'Save X/Twitter posts & threads as structured notes.',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw Dashboard',
        'project.clawhub.desc': 'Mobile management dashboard for OpenClaw AI Gateway — scan a QR code to monitor, chat, manage schedules & analyze usage in real time.',

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
        'footer.copyright': '\u00A9 2026 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
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
        'resume.tech.backend': 'Backend & Other',

        // Resume Page - Core Keys
        'resume.hero.title': 'Senior Mobile Developer | Android・Flutter・Blockchain',
        'resume.hero.remote': 'Remote Work Preferred',
        'resume.hero.edu': 'China University of Technology',
        'resume.hero.summary': 'Senior mobile developer with 13+ years of industry experience and 10+ years in native Android development. Proficient in Flutter cross-platform development and backend architecture. Deep in blockchain since 2013 (crypto/chain/mining). Skilled in architecture design and international team collaboration, frequently serving as Code Reviewer. Independently completed multi-chain blockchain interactions supporting 43+ blockchains. Long-term remote collaboration with engineers and designers from Cambodia, Vietnam, and Japan.',
        'resume.stat.years': 'Years Experience',
        'resume.stat.chains': 'Blockchains Supported',
        'resume.stat.apps': 'Published Apps',
        'resume.stat.countries': 'Countries Collaborated',
        'resume.exp.title': 'Work Experience',
        'resume.exp.tb.role': 'Android Tech Lead',
        'resume.exp.tb.desc': 'Tech lead for custodial + self-custodial hybrid wallet Android project. Responsible for architecture design, core feature development, and code review.',
        'resume.exp.tb.h1': 'Architecture decisions with MVVM + Jetpack Compose modern UI, dual-mode custodial & self-custodial wallet',
        'resume.exp.tb.h2': 'RxKotlin + Retrofit reactive networking, Dagger2 dependency injection',
        'resume.exp.tb.h3': 'Code Reviewer, establishing development standards and best practices',
        'resume.exp.tb.h4': 'CI/CD automation pipeline, performance and stability optimization',
        'resume.exp.ws.role': 'Full Stack Developer',
        'resume.exp.ws.desc': 'Decentralized/centralized hybrid wallet similar to OKX. Supporting USDt deposits, car rental and multi-service integration.',
        'resume.exp.ws.h1': 'Developed decentralized + centralized hybrid wallet architecture',
        'resume.exp.ws.h2': 'Integrated USDt payments, car rental and lifestyle services',
        'resume.exp.ws.h3': 'International team collaboration with multi-language support',
        'resume.exp.heytok.role': 'Flutter Tech Lead & DevOps',
        'resume.exp.heytok.desc': 'Tech lead for cross-platform IM + centralized crypto wallet app. Melos multi-module monorepo architecture supporting iOS/Android/macOS/Windows.',
        'resume.exp.heytok.h1': 'Melos multi-module architecture (chat, contact, wallet, 8+ business modules) with abstract router for cross-module communication',
        'resume.exp.heytok.h2': 'Riverpod state management + Dio/Retrofit networking + Floor SQLite offline storage',
        'resume.exp.heytok.h3': 'Agora RTC real-time audio/video integration, WebSocket live chat',
        'resume.exp.heytok.h4': 'iOS notarization automation, CI/CD automated build & release pipeline',
        'resume.exp.bbsport.role': 'Android Developer',
        'resume.exp.bbsport.desc': 'Multi-brand sports app Android development with modular architecture. 11 business modules + shared library, multi-channel multi-variant builds.',
        'resume.exp.bbsport.h1': 'AppJoint component architecture, 11 isolated business modules (home, sports, orders, user, payment, etc.)',
        'resume.exp.bbsport.h2': 'MVVM + DataBinding, RxKotlin + Coroutines hybrid async processing',
        'resume.exp.bbsport.h3': 'Dual logging system (Alibaba Cloud SLS + Tencent Cloud CLS), multi-channel packaging (Walle)',
        'resume.exp.bbsport.h4': 'Integrated customer service SDK (imchat), push notifications (JPush/EngageLab), CAPTCHA (GEETEST)',
        'resume.exp.jump.role': 'Android Developer',
        'resume.exp.jump.desc': 'Shonen Jump+ manga reading Android app development. High-performance list rendering, complex UI interactions, and real-time content updates.',
        'resume.exp.jump.h1': 'High-performance RecyclerView manga list with complex data structures and dynamic updates',
        'resume.exp.jump.h2': 'MVVM architecture, RxKotlin for complex async logic',
        'resume.exp.jump.h3': 'Data caching mechanism, list performance optimization (ViewHolder reuse, DiffUtil)',
        'resume.exp.mars.role': 'Mobile Developer (Android/iOS/Flutter)',
        'resume.exp.mars.desc': 'Centralized wallet with financial features, DApp browser, and instant swap. Flutter hybrid development for improved efficiency.',
        'resume.exp.mars.h1': 'Android + iOS + Flutter triple-platform hybrid development',
        'resume.exp.mars.h2': 'DApp browser and instant swap feature development',
        'resume.exp.mars.h3': 'Flutter Embed hybrid architecture with shared business logic',
        'resume.exp.lottery.title': 'Lottery Platform',
        'resume.exp.lottery.role': 'Android Developer',
        'resume.exp.lottery.desc': 'Lottery platform Android app development. Core business modules and real-time lottery draw features.',
        'resume.exp.lottery.h1': 'Lottery purchase, real-time draws, history tracking core features',
        'resume.exp.lottery.h2': 'High-concurrency real-time push notifications, Socket live data updates',
        'resume.exp.lottery.h3': 'Complex UI interactions and animation effects',
        'resume.exp.early.title': 'Early Career Projects',
        'resume.exp.early.role': 'Android / Backend Developer',
        'resume.exp.early.desc': 'Unity AR tools (UI Inject), RPG game Socket Server, and more. Entered blockchain in 2013, deeply involved in DeFi and GameFi ecosystems.',
        'resume.projects.title': 'Key Projects',
        'resume.proj.wallet.desc': 'Non-custodial decentralized wallet supporting 43+ blockchains. HD wallet (BIP-32/44), AES-256-GCM encryption, DApp browser, DeFi features. 190+ pages, 125+ UI components. Supports Ledger/Keystone/Trezor hardware wallets.',
        'resume.proj.wear.desc': "World's first Wear OS + Apple Watch blockchain wallet. Kotlin Multiplatform, Keystone hardware wallet air-gapped signing, Gemini AI voice command transactions. Supporting 22 chains.",
        'resume.proj.walletgo.desc': 'Enterprise-grade centralized wallet backend. Go high-performance service, HD wallet address pool (900 pre-generated), 3-tier cold storage, PostgreSQL RLS, API response < 200ms, 99.9% uptime.',
        'resume.proj.dartweb3.desc': 'Pure Dart Web3 SDK with modular architecture, no native dependencies (no FFI/C++/Rust bindings), works on all Dart/Flutter platforms. EVM core with extensions for Solana / Polkadot / Tron / TON / Bitcoin.',
        'resume.proj.solidity.desc': 'ERC-20/721 token contracts, Staking Pool, DeFi lending protocols, Mint & Repay mechanisms. OpenZeppelin standards, Hardhat testing & deployment, Gas optimization.',
        'resume.proj.stickerai.desc': 'AI sticker generator. Upload a photo, Google Gemini AI generates complete LINE sticker packs. Character consistency, multiple styles, one-click LINE-compliant ZIP download. Published on App Store & Google Play.',
        'resume.tech.title': 'Tech Stack',
        'resume.tech.ai': 'AI & Other',
        'resume.info.title': 'Education & Languages',
        'resume.info.edu': 'Education',
        'resume.info.edu.school': 'China University of Technology',
        'resume.info.lang': 'Languages',
        'resume.info.lang.cn': 'Chinese - Native',
        'resume.info.lang.en': 'English - Communicative (Technical docs, code review, international meetings)',
        'resume.info.lang.jp': 'Japanese - Basic conversation',
        'resume.info.style': 'Work Style',
        'resume.info.style.remote': 'Remote work preferred, experienced in async collaboration',
        'resume.info.style.intl': 'International teams: Cambodia, Vietnam, Japan',
        'resume.info.style.review': 'Code Reviewer & Architecture Designer',
        'resume.info.style.drive': 'Self-driven, able to deliver complex projects independently',
        'resume.print': 'Print / PDF',

        // Resume - New Project Keys
        'resume.filter.all': 'All',
        'resume.filter.oss': 'Open Source',
        'resume.proj.ordinals.desc': 'Comprehensive Dart SDK for Bitcoin Ordinals, BRC-20 tokens, and Inscription management. Supports PSBT construction, inscription transactions, pure Dart cross-platform.',
        'resume.proj.monero.desc': 'Pure Kotlin Multiplatform + Dart high-performance Monero wallet library. No C++ bindings required, natively supports Android, iOS, Desktop.',
        'resume.proj.swap.desc': 'Production-ready multi-chain swap aggregator. Unified interface for 20+ providers (1inch, Jupiter, Odos, etc.), supporting EVM, Solana, Bitcoin, Cosmos chains.',
        'resume.proj.imchat.desc': 'Enterprise customer service SDK providing real-time chat for third-party apps. WebSocket long-connection with auto-reconnect, encrypted messaging, 29+ business data models, Room offline storage. 15+ languages, Maven published.',
        'resume.proj.chartwise.desc': 'AI-powered crypto & stock chart analysis platform. Real-time data for 355+ trading instruments, integrating Fear & Greed Index, Long/Short ratio, ETF fund flows.',
        'resume.proj.yieldora.desc': 'ML-driven Bitfinex crypto lending bot. 6 intelligent strategies for automatic interest rate optimization, combined with multi-tenant SaaS platform. Flutter app for real-time yield monitoring.',
        'resume.proj.flashclaw.desc': 'Portable AI agent built on OpenClaw. Zero-setup instant use, multi-model switching, visual analysis, privacy-first design.',
        'resume.proj.clawhub.desc': 'OpenClaw AI Gateway mobile management dashboard. Scan QR Code for real-time monitoring, chat, schedule management, and usage analytics. WebSocket real-time communication.',
        'resume.proj.lobster.desc': 'Moltbook AI agent social network client. Browse AI-generated content, manage personal AI agents, observe autonomous agent interactions. Subscription and multi-model management.',
        'resume.proj.rentahuman.desc': 'Marketplace where AI agents hire humans to complete tasks. Reversing the typical human-AI relationship, supporting 11 languages, real-time messaging, secure booking system.',
        'resume.proj.carlog.desc': 'Taiwan-specific vehicle management app. Fuel logging, maintenance reminders, fuel efficiency analysis, integrated with Taiwan MVDIS for inspection dates, violation records, fuel tax status, and CPC oil prices.',
        'resume.proj.kashvox.desc': 'AI voice-powered expense tracking app. Voice input for smart expense recognition, invoice scanning, intelligent monthly spending trend analysis.',
        'resume.proj.extension.desc': 'Lightweight crypto wallet browser extension built with React + TypeScript, supporting EVM-compatible chains.',
        'resume.proj.flux.desc': 'Lightweight Flutter Server-Driven UI scripting engine. Custom .flux language compiled to bytecode, VM safely executes dynamic UI updates without resubmission. Includes 7 packages: compiler, VM, CLI, LSP, VSCode extension.',
        'resume.proj.termuxide.desc': 'Complete Flutter development environment on Android Termux. Supports 100+ language syntax highlighting, multi-file tabs, terminal integration, SSH connection.',
        'resume.proj.helloworld.desc': 'Hello World implementations in 60+ programming languages covering compiled, interpreted, and functional paradigms. Includes automated test scripts.',
        'resume.proj.todolist.desc': '100+ implementations of the same Todo List app across Web, Mobile, Desktop, and game engines as a complete learning resource.',
        'resume.proj.screeninu.desc': 'Cross-platform desktop screenshot OCR tool. Rust + Tauri high-performance, multi-engine OCR (Windows OCR + Tesseract 5), global shortcuts, history vault, auto-copy to clipboard.',
        'resume.proj.xmrig.desc': 'Cross-platform Monero/Wownero/DERO mining app. Supports 6 platforms (Android, iOS, Web, Desktop, WearOS, watchOS), real-time hashrate monitoring, multi-pool support.',
        'resume.proj.mahjong.desc': 'Cross-platform online game: Taiwan 16-tile Mahjong + Texas Hold\'em Poker. Flutter + Rust implementation, complete game flow, win detection, scoring, Bot AI.'
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

        // Project: ChartWise
        'project.cryptoai.title': 'ChartWise – マーケットリサーチ',
        'project.cryptoai.desc': 'AI 駆動の暗号通貨・株式チャート分析プラットフォーム。355+ 銘柄のリアルタイムデータ、Fear & Greed 指数、ロング/ショート比率、ETF フローなど多次元データを統合。',

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
        'project.intake.desc': 'AI食品スキャナー＆カロリートラッカー。毎日の食事と栄養摂取を簡単に記録。',

        // Project: FlashClaw
        'project.flashclaw.title': 'FlashClaw - OpenClaw Agent',
        'project.flashclaw.desc': 'OpenClawベースのポータブルAIエージェント。',

        // Project: T-Memo
        'project.tmemo.title': 'T-Memo: AI Bookmark Organizer',
        'project.tmemo.desc': 'X/Twitterの投稿を構造化されたノートとして保存。',

        // Project: ClawHub
        'project.clawhub.title': 'ClawHub - OpenClaw Dashboard',
        'project.clawhub.desc': 'OpenClaw AI Gatewayのモバイル管理パネル — QRコードをスキャンしてリアルタイム監視、チャット、スケジュール管理、使用量分析。',

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
        'footer.copyright': '\u00A9 2026 ImL1s. Built with passion.',

        // Platforms
        'platform.web': 'Web',
        'platform.ios': 'iOS',
        'platform.android': 'Android',
        'platform.chrome': 'Chrome Extension',
        'platform.opensource': 'Open Source',

        // Resume Page
        'nav.resume': '履歴書',
        'resume.role': 'シニアフルスタックエンジニア & ブロックチェーン専門家',
        'resume.intro': '業界経験12年以上。Android 10年、Flutter 5年。バックエンド (.NET/Go/Java/Node.js)、iOS、React Native、Unity 開発にも精通。',
        'resume.about': '自己紹介',
        'resume.exp': '職務経験',
        'resume.exp.total': '総経験 12年以上',
        'resume.exp.android': 'Android 開発 10年',
        'resume.exp.flutter': 'Flutter 開発 5年',
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
        'resume.tech.android': 'Android 開発',
        'resume.tech.ios': 'iOS 開発',
        'resume.tech.blockchain': 'ブロックチェーン & Solidity',
        'resume.tech.flutter': 'クロスプラットフォーム (Flutter)',
        'resume.tech.backend': 'バックエンド & その他',

        // Resume Page - Core Keys
        'resume.hero.title': 'シニアモバイル開発者 | Android・Flutter・Blockchain',
        'resume.hero.remote': 'リモートワーク希望',
        'resume.hero.edu': '中国科技大学',
        'resume.hero.summary': 'シニアモバイル開発エンジニア、13年以上の業界経験、10年以上の Android ネイティブ開発。Flutter クロスプラットフォーム開発とバックエンドアーキテクチャに精通。2013年よりブロックチェーン領域に深く携わる。アーキテクチャ設計と国際チーム協業を得意とし、Code Reviewer を務める。43+ ブロックチェーンをサポートするマルチチェーン開発を独力で完遂。カンボジア、ベトナム、日本のエンジニア・デザイナーと長期リモート協業。',
        'resume.stat.years': '年の経験',
        'resume.stat.chains': '対応ブロックチェーン',
        'resume.stat.apps': 'リリースアプリ',
        'resume.stat.countries': '国際協業',
        'resume.exp.title': '職務経歴',
        'resume.exp.tb.role': 'Android テックリード',
        'resume.exp.tb.desc': 'カストディアル + セルフカストディアルハイブリッドウォレット Android プロジェクトのテックリード。アーキテクチャ設計、コア機能開発、コードレビューを担当。',
        'resume.exp.tb.h1': 'MVVM + Jetpack Compose モダン UI、カストディアル・セルフカストディアルデュアルモードウォレットのアーキテクチャ設計',
        'resume.exp.tb.h2': 'RxKotlin + Retrofit リアクティブ通信、Dagger2 DI',
        'resume.exp.tb.h3': 'Code Reviewer として開発規約とベストプラクティスを策定',
        'resume.exp.tb.h4': 'CI/CD 自動化パイプライン構築、パフォーマンス・安定性の最適化',
        'resume.exp.ws.role': 'フルスタック開発者',
        'resume.exp.ws.desc': 'OKX 類似の分散型/中央集権型ハイブリッドウォレット。USDt 入金、レンタカーなど多元サービス統合。',
        'resume.exp.ws.h1': '分散型 + 中央集権型ハイブリッドウォレットアーキテクチャの開発',
        'resume.exp.ws.h2': 'USDt 決済、レンタカーなど生活サービスの統合',
        'resume.exp.ws.h3': '国際チーム協業、多言語サポート',
        'resume.exp.heytok.role': 'Flutter テックリード & DevOps',
        'resume.exp.heytok.desc': 'クロスプラットフォーム IM + 中央集権型暗号通貨ウォレットの技術責任者。Melos マルチモジュール monorepo、iOS/Android/macOS/Windows 4 プラットフォーム対応。',
        'resume.exp.heytok.h1': 'Melos マルチモジュール（chat、contact、wallet 等 8+ ビジネスモジュール）、抽象ルーターによるモジュール間通信',
        'resume.exp.heytok.h2': 'Riverpod 状態管理 + Dio/Retrofit ネットワーク層 + Floor SQLite オフラインストレージ',
        'resume.exp.heytok.h3': 'Agora RTC リアルタイム音声/ビデオ統合、WebSocket ライブチャット',
        'resume.exp.heytok.h4': 'iOS 公証自動化、CI/CD 自動ビルド・リリースパイプライン構築',
        'resume.exp.bbsport.role': 'Android 開発者',
        'resume.exp.bbsport.desc': 'マルチブランドスポーツアプリの Android 開発。モジュラーアーキテクチャ設計、11 ビジネスモジュール + 共有ライブラリ。',
        'resume.exp.bbsport.h1': 'AppJoint コンポーネント化、11 ビジネスモジュール分離（ホーム、スポーツ、注文、ユーザー、決済等）',
        'resume.exp.bbsport.h2': 'MVVM + DataBinding、RxKotlin + Coroutines ハイブリッド非同期処理',
        'resume.exp.bbsport.h3': 'デュアルログシステム（Alibaba Cloud SLS + Tencent Cloud CLS）、マルチチャネルパッケージング（Walle）',
        'resume.exp.bbsport.h4': 'カスタマーサービス SDK（imchat）、プッシュ通知（JPush/EngageLab）、CAPTCHA（GEETEST）統合',
        'resume.exp.jump.role': 'Android 開発者',
        'resume.exp.jump.desc': '少年ジャンプ+ マンガ閲覧 Android アプリ開発。高性能リストレンダリング、複雑な UI インタラクション、リアルタイムコンテンツ更新。',
        'resume.exp.jump.h1': 'RecyclerView 高性能マンガリスト、複雑なデータ構造と動的更新対応',
        'resume.exp.jump.h2': 'MVVM アーキテクチャ、RxKotlin による複雑な非同期処理',
        'resume.exp.jump.h3': 'データキャッシュメカニズム、リスト性能最適化（ViewHolder 再利用、DiffUtil）',
        'resume.exp.mars.role': 'モバイル開発 (Android/iOS/Flutter)',
        'resume.exp.mars.desc': '金融機能、DApp ブラウザ、即時スワップを備えた中央集権型ウォレット。Flutter ハイブリッド開発で効率向上。',
        'resume.exp.mars.h1': 'Android + iOS + Flutter トリプルプラットフォーム ハイブリッド開発',
        'resume.exp.mars.h2': 'DApp ブラウザ、即時スワップ機能の開発',
        'resume.exp.mars.h3': 'Flutter Embed ハイブリッドアーキテクチャでビジネスロジック共有',
        'resume.exp.lottery.title': '宝くじプラットフォーム',
        'resume.exp.lottery.role': 'Android 開発者',
        'resume.exp.lottery.desc': '宝くじプラットフォーム Android アプリ開発。コアビジネスモジュールとリアルタイム抽選機能の実装。',
        'resume.exp.lottery.h1': '宝くじ購入、リアルタイム抽選、履歴管理などコア機能開発',
        'resume.exp.lottery.h2': '高並行リアルタイムプッシュ通知、Socket ライブデータ更新',
        'resume.exp.lottery.h3': '複雑な UI インタラクションとアニメーション効果の実装',
        'resume.exp.early.title': '初期キャリア',
        'resume.exp.early.role': 'Android / バックエンド開発者',
        'resume.exp.early.desc': 'Unity AR ツール（UI Inject）、RPG ゲーム Socket Server 開発など。2013年よりブロックチェーン領域に参入、DeFi・GameFi エコシステムに深く関与。',
        'resume.projects.title': '代表的なプロジェクト',
        'resume.proj.wallet.desc': '43+ ブロックチェーン対応の非カストディアル分散型ウォレット。HD ウォレット（BIP-32/44）、AES-256-GCM 暗号化、DApp ブラウザ、DeFi 機能。190+ ページ、125+ UI コンポーネント。Ledger/Keystone/Trezor ハードウェアウォレット対応。',
        'resume.proj.wear.desc': '世界初の Wear OS + Apple Watch ブロックチェーンウォレット。Kotlin Multiplatform、Keystone エアギャップ署名、Gemini AI 音声コマンド取引。22 チェーン対応。',
        'resume.proj.walletgo.desc': 'エンタープライズ級中央集権型ウォレットバックエンド。Go 高性能サービス、HD ウォレットアドレスプール（900 事前生成）、3層コールドストレージ、PostgreSQL RLS、API 応答 < 200ms、99.9% uptime。',
        'resume.proj.dartweb3.desc': '純 Dart Web3 SDK、モジュラーアーキテクチャ、ネイティブ依存なし（FFI/C++/Rust 不要）、全 Dart/Flutter プラットフォームで動作。EVM コアに Solana / Polkadot / Tron / TON / Bitcoin 拡張。',
        'resume.proj.solidity.desc': 'ERC-20/721 トークンコントラクト、Staking Pool、DeFi レンディングプロトコル、Mint & Repay メカニズム。OpenZeppelin 標準、Hardhat テスト・デプロイ、Gas 最適化。',
        'resume.proj.stickerai.desc': 'AI スタンプジェネレーター。写真をアップロードすると Google Gemini AI が LINE スタンプパックを自動生成。キャラクター一貫性、複数スタイル対応、LINE 規格 ZIP ワンクリックダウンロード。App Store & Google Play 公開済。',
        'resume.tech.title': '技術スタック',
        'resume.tech.ai': 'AI & その他',
        'resume.info.title': '学歴 & 語学',
        'resume.info.edu': '学歴',
        'resume.info.edu.school': '中国科技大学',
        'resume.info.lang': '語学',
        'resume.info.lang.cn': '中国語 - ネイティブ',
        'resume.info.lang.en': '英語 - 日常会話（技術文書、コードレビュー、国際会議）',
        'resume.info.lang.jp': '日本語 - 少し話せます',
        'resume.info.style': 'ワークスタイル',
        'resume.info.style.remote': 'リモートワーク希望、非同期コラボレーション経験豊富',
        'resume.info.style.intl': '国際チーム：カンボジア、ベトナム、日本',
        'resume.info.style.review': 'コードレビュー & アーキテクチャ設計',
        'resume.info.style.drive': '自己駆動型、複雑なプロジェクトを独力で遂行可能',
        'resume.print': '印刷 / PDF',

        // Resume - New Project Keys
        'resume.filter.all': 'すべて',
        'resume.filter.oss': 'オープンソース',
        'resume.proj.ordinals.desc': 'Bitcoin Ordinals、BRC-20 トークン、インスクリプション管理の包括的 Dart SDK。PSBT 構築、インスクリプション取引対応、純 Dart クロスプラットフォーム。',
        'resume.proj.monero.desc': '純 Kotlin Multiplatform + Dart 実装の高性能 Monero ウォレットライブラリ。C++ バインディング不要、Android、iOS、Desktop をネイティブサポート。',
        'resume.proj.swap.desc': 'プロダクション対応マルチチェーンスワップアグリゲーター。20+ プロバイダー（1inch、Jupiter、Odos 等）の統一インターフェース。EVM、Solana、Bitcoin、Cosmos チェーン対応。',
        'resume.proj.imchat.desc': 'エンタープライズ級カスタマーサービス SDK。WebSocket 長時間接続自動再接続、暗号化メッセージング、29+ ビジネスデータモデル、Room オフラインストレージ。15+ 言語対応、Maven 公開。',
        'resume.proj.chartwise.desc': 'AI 駆動の暗号通貨・株式チャート分析プラットフォーム。355+ 銘柄のリアルタイムデータ、Fear & Greed 指数、ロング/ショート比率、ETF フローなど多次元データを統合。',
        'resume.proj.yieldora.desc': 'ML 駆動の Bitfinex 暗号通貨レンディングボット。6 つのインテリジェント戦略で金利を自動最適化、マルチテナント SaaS プラットフォーム統合。Flutter アプリでリアルタイム収益監視。',
        'resume.proj.flashclaw.desc': 'OpenClaw ベースのポータブル AI エージェント。ゼロセットアップで即使用、マルチモデル切替、ビジュアル分析、プライバシーファースト設計。',
        'resume.proj.clawhub.desc': 'OpenClaw AI Gateway モバイル管理ダッシュボード。QR コードスキャンでリアルタイム監視、チャット、スケジュール管理、使用量分析。WebSocket リアルタイム通信。',
        'resume.proj.lobster.desc': 'Moltbook AI エージェントソーシャルネットワーククライアント。AI 生成コンテンツの閲覧、個人 AI エージェント管理、エージェントの自律的インタラクション観察。サブスクリプションとマルチモデル管理。',
        'resume.proj.rentahuman.desc': 'AI エージェントが人間にタスクを依頼するマーケットプレイス。人間-AI の関係を逆転、11 言語対応、リアルタイムメッセージング、セキュアな予約システム。',
        'resume.proj.carlog.desc': '台湾専用車両管理アプリ。燃費記録、メンテナンスリマインダー、燃費効率分析、台湾 MVDIS との連携（車検日、違反記録、燃料税状態、CPC 原油価格）。',
        'resume.proj.kashvox.desc': 'AI 音声家計簿アプリ。音声入力で支出をスマート認識、請求書スキャン、月間支出トレンドのインテリジェント分析。',
        'resume.proj.extension.desc': 'React + TypeScript で開発された軽量暗号通貨ウォレットブラウザ拡張機能。EVM 互換チェーン対応。',
        'resume.proj.flux.desc': '軽量 Flutter Server-Driven UI スクリプトエンジン。カスタム .flux 言語をバイトコードにコンパイル、VM で安全に動的 UI 更新を実行、再申請不要。7 パッケージ：コンパイラ、VM、CLI、LSP、VSCode 拡張。',
        'resume.proj.termuxide.desc': 'Android Termux 上の完全な Flutter 開発環境。100+ 言語のシンタックスハイライト、マルチファイルタブ、ターミナル統合、SSH 接続対応。',
        'resume.proj.helloworld.desc': '60+ プログラミング言語の Hello World 実装集。コンパイル型、インタプリタ型、関数型などを網羅。自動テストスクリプト付き。',
        'resume.proj.todolist.desc': '同じ Todo List アプリの 100+ 種類の実装。Web、Mobile、Desktop、ゲームエンジンなど完全な学習リソース。',
        'resume.proj.screeninu.desc': 'クロスプラットフォームデスクトップスクリーンショット OCR ツール。Rust + Tauri 高性能、マルチエンジン OCR（Windows OCR + Tesseract 5）、グローバルショートカット、履歴保存、クリップボード自動コピー。',
        'resume.proj.xmrig.desc': 'クロスプラットフォーム Monero/Wownero/DERO マイニングアプリ。6 プラットフォーム対応（Android、iOS、Web、Desktop、WearOS、watchOS）、リアルタイムハッシュレート監視、マルチプール対応。',
        'resume.proj.mahjong.desc': 'クロスプラットフォームオンラインゲーム：台湾 16 枚麻雀 + テキサスホールデム。Flutter + Rust 実装、完全なゲームフロー、和了検出、スコアリング、Bot AI。'
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
    'zh-TW': '',
    'zh-CN': '',
    'en': '',
    'ja': ''
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
            'zh-TW': 'ImL1s - 台灣全端開發者。專精 Flutter、React、TypeScript 跨平台應用開發。9+ 開源專案、16+ 上架應用、支援 43+ 區塊鏈。',
            'zh-CN': 'ImL1s - 台湾全栈开发者。专精 Flutter、React、TypeScript 跨平台应用开发。9+ 开源项目、16+ 上架应用、支持 43+ 区块链。',
            'en': 'ImL1s - Full Stack Developer from Taiwan. Specializing in Flutter, React, TypeScript cross-platform development. 9+ open source projects, 16+ published apps, 43+ blockchain support.',
            'ja': 'ImL1s - 台湾のフルスタック開発者。Flutter、React、TypeScript クロスプラットフォーム開発専門。9+ オープンソースプロジェクト、16+ リリースアプリ、43+ ブロックチェーン対応。'
        };
        metaDesc.content = descriptions[currentLanguage] || descriptions['en'];
    }

    // Update language switcher button text
    const langBtn = document.querySelector('.lang-btn-text');
    if (langBtn) {
        langBtn.textContent = languageNames[currentLanguage];
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
