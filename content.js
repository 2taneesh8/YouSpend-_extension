console.log("🧠 YouSpend+ content script loaded");

const amazonFlipkartPriceSelectors = [
  "#priceblock_ourprice",
  "#priceblock_dealprice",
  "span.a-price > span.a-offscreen",
  "._30jeq3._16Jk6d",
  "._16Jk6d",
  "._3qQ9m1",
  ".Nx9bqj.CxhGGd"
];

const myntraPriceSelector = ".PriceInfo-price";
const nykaaPriceSelector = ".css-1jczs19";

const amazonFlipkartBuySelectors = [
  "#buy-now-button",
  'input[name="submit.buy-now"]',
  '._2KpZ6l._2ObVJD._3AWRsL',
  '._2AkmmA._2Npkh4._2kuvG8._7UHT_c',
  ".QqFHMw.vslbG\\+.\\_3Yl67G.\\_7Pd1Fp"
];

const myntraBuySelector = "div.pdp-add-to-bag.pdp-button.pdp-flex.pdp-center";
const nykaaBuySelector = ".btn-text";

function extractPriceFromText(text) {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const match = cleaned.match(/\d+(\.\d{1,2})?/);
  return match ? parseFloat(match[0]) : null;
}

function getPrice() {
  for (const selector of amazonFlipkartPriceSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const price = extractPriceFromText(el.textContent || "");
      if (price) return { site: "generic", price };
    }
  }

  const myntraEl = document.querySelector(myntraPriceSelector);
  if (myntraEl) {
    const price = extractPriceFromText(myntraEl.textContent || "");
    if (price) return { site: "myntra", price };
  }

  const nykaaEl = document.querySelector(nykaaPriceSelector);
  if (nykaaEl) {
    const price = extractPriceFromText(nykaaEl.textContent || "");
    if (price) return { site: "nykaa", price };
  }

  return null;
}

let currentSpendingLimit = 1000;
let allowBypassOnce = false;
let lastClickedTarget = null;

function showCustomAlert(message, onContinue) {
  if (document.getElementById("youspend-alert-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "youspend-alert-modal";
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(6px);
    display: flex; justify-content: center; align-items: center;
    z-index: 999999;
    animation: fadeIn 0.3s ease forwards;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    border-radius: 18px;
    padding: 28px 32px;
    max-width: 420px;
    width: 90%;
    text-align: center;
    font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transform: scale(0.95);
    animation: popIn 0.3s ease forwards;
  `;

  const styleTag = document.createElement("style");
  styleTag.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    #youspend-alert-modal button:hover { opacity: 0.9; }
    #youspend-alert-modal .btn-group button { margin: 0 8px; }
  `;
  document.head.appendChild(styleTag);

  const text = document.createElement("p");
  text.textContent = message;
  text.style.cssText = `
    font-size: 17px;
    color: #333;
    margin-bottom: 24px;
    white-space: pre-line;
  `;

  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group";

  const btnOk = document.createElement("button");
  btnOk.textContent = "OK, Got it!";
  btnOk.style.cssText = `
    padding: 10px 24px;
    font-weight: bold;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 40px;
    cursor: pointer;
  `;
  btnOk.onclick = () => close();

  const btnContinue = document.createElement("button");
  btnContinue.textContent = "Continue";
  btnContinue.style.cssText = `
    padding: 10px 24px;
    font-weight: bold;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 40px;
    cursor: pointer;
  `;
  btnContinue.onclick = () => {
    close();
    if (typeof onContinue === "function") onContinue();
  };

  function close() {
    overlay.remove();
    styleTag.remove();
  }

  chrome.storage.local.get("focusMode", data => {
    const focusModeOn = Boolean(data.focusMode);
    btnGroup.appendChild(btnOk);
    if (!focusModeOn) {
      btnGroup.appendChild(btnContinue);
    }
  });

  modal.appendChild(text);
  modal.appendChild(btnGroup);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function handleBuyClick(event) {
  const result = getPrice();
  if (!result || !result.price) return;

  const price = result.price;

  if (price > currentSpendingLimit && !allowBypassOnce) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const site = result.site;
    let selectorList = amazonFlipkartBuySelectors;
    if (site === "myntra") selectorList = [myntraBuySelector];
    else if (site === "nykaa") selectorList = [nykaaBuySelector];

    const realBtn = event.target.closest(selectorList.join(","));
    lastClickedTarget = realBtn;

    chrome.storage.local.get(["blockCount", "savedAmount"], (data) => {
      const blockCount = (data.blockCount || 0) + 1;
      const savedAmount = (data.savedAmount || 0) + price;
      chrome.storage.local.set({ blockCount, savedAmount });
    });

    // Focus Streak Logic
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(["lastBlockDate", "focusStreak"], data => {
      const lastDate = data.lastBlockDate;
      let streak = data.focusStreak || 0;

      if (lastDate === today) return;

      if (lastDate) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === yesterday) {
          streak += 1;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }

      chrome.storage.local.set({
        lastBlockDate: today,
        focusStreak: streak
      });
    });

    showCustomAlert(
      `⚠️ This item costs ₹${price.toLocaleString("en-IN")} which exceeds your limit of ₹${currentSpendingLimit.toLocaleString("en-IN")}.
\n\nPlease increase your limit to proceed or continue anyway.`,
      () => {
        allowBypassOnce = true;
        setTimeout(() => {
          if (lastClickedTarget && document.body.contains(lastClickedTarget)) {
            if (location.hostname.includes("flipkart.com")) {
              window.location.href = "https://www.flipkart.com/checkout/init";
            } else {
              lastClickedTarget.click();
            }
          }
          allowBypassOnce = false;
        }, 300);
      }
    );
    return true;
  }
  return false;
}

function setupClickInterception(site) {
  document.removeEventListener("click", window.__youSpendClickHandler, true);

  let selectorList;
  if (site === "myntra") selectorList = [myntraBuySelector];
  else if (site === "nykaa") selectorList = [nykaaBuySelector];
  else selectorList = amazonFlipkartBuySelectors;

  window.__youSpendClickHandler = function (event) {
    const target = event.target.closest(selectorList.join(","));
    if (!target) return;
    handleBuyClick(event);
  };

  document.addEventListener("click", window.__youSpendClickHandler, true);
}

function init() {
  chrome.storage.local.get("spendingLimit", data => {
    currentSpendingLimit = Number(data.spendingLimit) || 1000;
    const result = getPrice();
    if (result) {
      setupClickInterception(result.site);
    } else {
      const observer = new MutationObserver(() => {
        const newResult = getPrice();
        if (newResult) {
          setupClickInterception(newResult.site);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 15000);
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.spendingLimit) {
    currentSpendingLimit = Number(changes.spendingLimit.newValue) || 1000;
  }
});

let lastUrl = location.href;
const observeUrlChange = () => {
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      init();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("popstate", () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      init();
    }
  });
};

observeUrlChange();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    init();
  }
});

setTimeout(init, 1500);
