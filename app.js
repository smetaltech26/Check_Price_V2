(() => {
  "use strict";

  const config = window.PRICE_CONFIG;
  const state = { rows: [], headers: {}, scanner: null, loading: false };
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    status: $("#connectionStatus"), scan: $("#scanButton"), refresh: $("#refreshButton"),
    form: $("#searchForm"), search: $("#searchInput"),
    results: $("#resultSection"), grid: $("#resultGrid"), count: $("#resultCount"),
    empty: $("#emptyState"), modal: $("#scannerModal"), toast: $("#toast")
  };

  const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("th-TH");
  const safe = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

  function parseCsv(text) {
    const rows = []; let row = []; let field = ""; let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(field); field = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field); if (row.some((cell) => cell.trim())) rows.push(row); row = []; field = "";
      } else field += char;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function resolveHeader(headers, candidates) {
    return candidates.map(normalize).map((candidate) => headers.find((header) => normalize(header) === candidate)).find(Boolean);
  }

  async function loadData(force = false) {
    if (state.loading) return;
    state.loading = true; setStatus("loading", "กำลังโหลดข้อมูล");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheetName)}&_=${force ? Date.now() : ""}`;
      const response = await fetch(url, { cache: force ? "no-store" : "default" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = parseCsv(await response.text());
      if (data.length < 2) throw new Error("ไม่พบข้อมูลในชีต");
      const headers = data[0].map((header) => header.trim());
      state.headers = Object.fromEntries(Object.entries(config.columns).map(([key, candidates]) => [key, resolveHeader(headers, candidates)]));
      const missing = Object.entries(state.headers).filter(([, header]) => !header).map(([key]) => key);
      if (missing.length) throw new Error(`ไม่พบคอลัมน์: ${missing.join(", ")}`);
      state.rows = data.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))).filter((row) => row[state.headers.item] || row[state.headers.name]);
      setStatus("online", `พร้อมใช้งาน · ${state.rows.length.toLocaleString("th-TH")} รายการ`);
      if (force) showToast("อัปเดตข้อมูลล่าสุดแล้ว");
    } catch (error) {
      console.error(error); setStatus("error", "เชื่อมต่อข้อมูลไม่ได้");
      showToast("กรุณาตรวจสอบสิทธิ์ Google Sheet และลองใหม่", true);
    } finally { state.loading = false; }
  }

  function setStatus(type, message) { elements.status.className = `status-pill ${type}`; elements.status.querySelector("span").textContent = message; }
  function showToast(message, isError = false) { elements.toast.textContent = message; elements.toast.className = `toast show${isError ? " error" : ""}`; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 3200); }
  function price(value) { const number = Number(String(value).replace(/[^0-9.-]/g, "")); return Number.isFinite(number) ? new Intl.NumberFormat("th-TH", { style: "currency", currency: config.currency, minimumFractionDigits: 2 }).format(number) : (value || "—"); }

  function search(query) {
    const keyword = normalize(query);
    if (!keyword) { showToast("กรุณากรอก ITEM หรือ Name Part", true); return; }
    const matches = state.rows.filter((row) =>
      normalize(row[state.headers.item]).includes(keyword) ||
      normalize(row[state.headers.name]).includes(keyword)
    );
    renderResults(matches);
  }

  function renderResults(rows) {
    elements.empty.hidden = true; elements.results.hidden = false;
    elements.count.textContent = `${rows.length.toLocaleString("th-TH")} รายการ`;
    if (!rows.length) { elements.grid.innerHTML = '<div class="no-result"><div>?</div><h3>ไม่พบข้อมูลสินค้า</h3><p>ลองตรวจสอบ ITEM หรือชื่อ Part อีกครั้งนะคะ</p></div>'; return; }
    elements.grid.innerHTML = rows.slice(0, 100).map((row) => `<article class="product-card glass-card">
      <div class="card-top"><span class="item-badge">ITEM</span><strong>${safe(row[state.headers.item])}</strong></div>
      <h3>${safe(row[state.headers.name]) || "ไม่ระบุชื่อ Part"}</h3>
      <div class="price-list"><div class="price-box sale"><span>ราคาขาย</span><strong>${safe(price(row[state.headers.salePrice]))}</strong></div><div class="price-box material"><span>ราคาวัตถุดิบ</span><strong>${safe(price(row[state.headers.materialPrice]))}</strong></div></div>
    </article>`).join("");
  }

  function extractItem(decoded) {
    try { const url = new URL(decoded); return url.searchParams.get("item") || url.searchParams.get("ITEM") || decoded; } catch { return decoded.trim(); }
  }

  async function openScanner() {
    if (!window.Html5Qrcode) { showToast("ระบบสแกนยังโหลดไม่สำเร็จ กรุณาลองใหม่", true); return; }
    elements.modal.hidden = false; document.body.classList.add("modal-open");
    try {
      state.scanner = new Html5Qrcode("qrReader");
      await state.scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 }, async (decoded) => {
        const item = extractItem(decoded); await closeScanner(); elements.search.value = item; search(item);
      }, () => {});
    } catch (error) { console.error(error); await closeScanner(); showToast("เปิดกล้องไม่ได้ กรุณาอนุญาตใช้กล้องหรือลองกรอก ITEM", true); }
  }

  async function closeScanner() {
    if (state.scanner) { try { if (state.scanner.isScanning) await state.scanner.stop(); await state.scanner.clear(); } catch (error) { console.warn(error); } state.scanner = null; }
    elements.modal.hidden = true; document.body.classList.remove("modal-open");
  }

  elements.form.addEventListener("submit", (event) => { event.preventDefault(); if (!state.rows.length) { showToast("ฐานข้อมูลยังไม่พร้อม กรุณาโหลดใหม่", true); return; } search(elements.search.value); });
  elements.scan.addEventListener("click", openScanner);
  elements.refresh.addEventListener("click", () => loadData(true));
  document.querySelectorAll("[data-close-scanner]").forEach((element) => element.addEventListener("click", closeScanner));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !elements.modal.hidden) closeScanner(); });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
  loadData();
})();
