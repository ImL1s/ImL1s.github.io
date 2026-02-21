# Bitfinex 放貸機器人實作問題審視

本文整理截至目前程式碼檢視所發現的關鍵問題，提供後續修正參考。

## 1. API 與掛單流程

- **FRR 訂單型別不符 API 規格**

- **FRR Delta 策略仍以 LIMIT 掛單**  
  來源：`internal/strategy/frr_delta.go:64-118`, `internal/client/bitfinex.go:432-439`  
  現況：FRR Delta/Hybrid 策略生成的報價型別一律設為 `"LIMIT"`，即使最終應落在 FRR Delta 變動/固定單，導致觸發高利率調整時仍是靜態掛單。  
  建議：依策略模式改為使用 `FRRDELTAVAR`/`FRRDELTAFIX` 並傳入 `rate=0` 或對應偏移值。  
  來源：`internal/client/bitfinex.go:423-471`  
  現況：策略在回傳 `offer.Type` 為 `"FRR"` 時會直接送到 Bitfinex，但官方 REST 端點要求使用 `FRRDELTAVAR`（rate 設 0 表示跟隨 FRR）或 `FRRDELTAFIX`。一旦啟用 FRR 策略，系統會持續收到 400/500 錯誤。  
  建議：建立型別映射表，依策略意圖轉換為 `LIMIT`/`FRRDELTAVAR`/`FRRDELTAFIX`，並於 payload 中正確設定 `rate` 與 `flags`。

- **REST 基底網址無法覆蓋**  
  來源：`internal/client/bitfinex.go:24`, `internal/client/bitfinex.go:543`  
  現況：程式以常數 `BaseURL` 呼叫 API，忽略 `config.API.RESTEndpoint`。導致無法連到 Sandbox 或自建 Proxy。  
  建議：初始化 client 時以設定檔覆蓋 REST/WS URL，或在 `makeAuthenticatedRequest` 依設定決定主機。

- **掛單後未完整追蹤回傳資料**  
  來源：`internal/bot/bot.go:366-383`  
  現況：掛單成功時只把 Bitfinex 回傳的整個 `response` 物件塞回 `activeOffers`，不同結構混存 map，後續解析需大量型別判斷。  
  建議：統一轉為 `strategy.FundingOffer` 或自訂結構，保留必要欄位並標示資料來源。

## 2. WebSocket 與即時資料

- **WebSocket 未對行情事件播報**  
  來源：`internal/client/bitfinex.go:250-297`, `internal/bot/bot.go:233-236`  
  現況：`handleMessages` 每讀到資料只呼叫 `processMessage`，而 `processMessage` 僅處理 `info/auth/subscribed` 等控制訊息，完全沒有解析 array frame 並推入 `c.events`。主迴圈因此收不到 ticker/book/funding update，整個即時邏輯失效。  
  建議：依 Bitfinex v2 WebSocket 規格解析 array 格式，將 ticker/orderbook/funding 更新轉為型別化事件，透過 `c.events` 廣播給 bot。

- **訂閱頻道名稱錯誤**  
  來源：`internal/bot/bot.go:414-428`  
  現況：程式訂閱 `Subscribe("funding", cfg.Bot.Currency)`，但 Bitfinex 沒有此公共 channel；若要監看 Funding ticker，應使用 `channel:"ticker", symbol:"fUSD"`；若要監看 Funding trades/簿價，需另依 API 文件使用正確參數。  
  建議：依需求改為 `ticker`、`book` 等正規符號並確保 WebSocket 事件解析正確。

## 3. 風險管理

- **ApplyLimits 公式導致所有報價被砍成 0**  
  來源：`internal/risk/manager.go:386-417`  
  現況：`maxSingleAmount` 以當前 `totalAmount` 計算；第一筆迴圈時 `totalAmount=0`，上限即 0，結果第一筆訂單的 `offer.Amount` 直接變 0。主流程只好暫時跳過風控（`internal/bot/bot.go:283-287`）。  
  建議：改以帳戶總資金或策略原始分配為基準計算限額，再把風控重新啟用。

- **集中度計算使用固定常數**  
  來源：`internal/risk/manager.go:172-211`  
  現況：每筆報價金額硬寫 `1000`，HHI 永遠固定，無法反映實際曝險。  
  建議：解析 `activeOffers` 內的實際金額，或改用資料庫紀錄。

- **歷史損失、預警等機制未整合**  
  現況：`UpdateLosses` 未被呼叫；`RiskMetrics` 雖記錄評分，但沒有對外曝露 API 或寫入監控。需確認是否預期行為。

## 4. 錢包與監控統計

- **錢包映射不符合 Bitfinex 回傳格式**

- **忽略 Wallet 可用餘額欄位**  \
  來源：`internal/client/bitfinex.go:311-325`  \
  現況：Bitfinex `/v2/auth/r/wallets` 回傳陣列 `[type, currency, balance, unsettled_interest, available]`，程式只讀取索引 2 的 `balance` 當作可用餘額，導致必須手動扣 active offers，仍無法得知實際可動用資金。  \
  建議：改讀索引 4 的 `available` 欄位；若為 `nil` 則回退計算，再以此餘額餵給餘額、風控與分配邏輯。  
  來源：`internal/client/bitfinex.go:316-325`, `internal/monitoring/metrics.go:319-340`, `internal/bot/bot.go:611-624`  
  現況：Bitfinex `/v2/auth/r/wallets` 只會回 `funding_USD`、`exchange_USD` 等欄位，程式卻期望 `funding_lent_USD` 及 `total_USD`。利用率、資料庫 balance history 因此要嘛缺資料、要嘛錯計。  
  建議：從 `funding_USD` 取得可用餘額，`activeOffers`/貸出紀錄計算已借出金額，自行組出 `total` 與 `lent` 後再送進 metrics。

- **Prometheus 指標僅在成功掛單時更新**  
  現況：`RecordOfferSubmitted`、`RecordLoanExecuted` 有寫入，但當前 WebSocket 沒有事件、風控被跳過，指標實際上永遠是 0。修復即時和風控後需再驗證。

## 5. 其他觀察

- **策略共用資料不一致**  
  現況：`activeOffers` 同時存入 `*client.FundingOffer` 及 `map[string]interface{}`，造成型別判斷複雜。建議統一結構。  
- **缺少整體整合測試**  
  建議建立 Sandbox 自動化驗證（掛單→成交→紀錄→監控）是否工作，以避免迴歸。

---

若需後續追蹤，可於此文件持續補充修復進度。
