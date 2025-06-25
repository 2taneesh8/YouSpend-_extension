document.addEventListener('DOMContentLoaded', () => {
  const reflectBtn = document.getElementById('reflectBtn');
  const savedReflection = document.getElementById('savedReflection');
  const tipText = document.getElementById('tipText');
  const limitInput = document.getElementById('limitInput');
  const saveLimitBtn = document.getElementById('saveLimit');
  const limitSavedMessage = document.getElementById('limitSavedMessage');
  const blocksTriggeredText = document.getElementById('blocksTriggeredText');
  const amountSavedText = document.getElementById('amountSavedText');
  const streakText = document.getElementById('streakText');

  // Format number to Indian style commas
  function formatIndianNumber(num) {
    const x = num.toString().replace(/,/g, '');
    let lastThree = x.substring(x.length - 3);
    let otherNumbers = x.substring(0, x.length - 3);
    if (otherNumbers !== '') lastThree = ',' + lastThree;
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  }

  // Parse string removing commas
  function parseNumber(str) {
    return parseInt(str.replace(/,/g, ''), 10);
  }

  // Load saved reflection
  chrome.storage.local.get('weeklyReflection', data => {
    savedReflection.textContent = data.weeklyReflection || "No reflection saved yet.";
  });

  // Load spending limit, or default 1500
  chrome.storage.local.get('spendingLimit', data => {
    limitInput.value = data.spendingLimit ? formatIndianNumber(data.spendingLimit) : formatIndianNumber(1500);
  });

  // Update Smart Insights text from storage
  chrome.storage.local.get(['blockCount', 'savedAmount'], data => {
    const blockCount = data.blockCount || 0;
    const savedAmount = data.savedAmount || 0;
    if(blocksTriggeredText) {
      blocksTriggeredText.textContent = `Total blocks: ${blockCount}`;
    }
    if(amountSavedText) {
      amountSavedText.textContent = `Money saved: ₹${formatIndianNumber(savedAmount)}`;
    }
  });

  // Load Focus Streak from storage
  chrome.storage.local.get('focusStreak', data => {
    const streak = data.focusStreak || 0;
    if (streakText) {
      streakText.textContent = `🔥 ${streak}-day focus streak`;
    }
  });

  // Show random tip
  const tips = [
    "Start saving at least 10% of your income.",
    "Avoid debt on things that lose value.",
    "Make a budget and track your expenses.",
    "Impulse buying can hurt your financial health.",
    "Invest early to benefit from compounding.",
    "Pay yourself first: save before you spend."
  ];
  tipText.textContent = tips[Math.floor(Math.random() * tips.length)];

  // Reflect button click
  reflectBtn.addEventListener('click', () => {
    const input = prompt("What did you learn about your spending this week?");
    if (input) {
      chrome.storage.local.set({ weeklyReflection: input }, () => {
        savedReflection.textContent = input;
      });
    }
  });

  // Format input live
  limitInput.addEventListener('input', () => {
    const cleaned = limitInput.value.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      limitInput.value = '';
      return;
    }
    limitInput.value = formatIndianNumber(cleaned);
  });

  // Save limit on button click
  saveLimitBtn.addEventListener('click', () => {
    const limit = parseNumber(limitInput.value);
    if (!isNaN(limit) && limit > 0) {
      chrome.storage.local.set({ spendingLimit: limit }, () => {
        limitSavedMessage.style.display = 'block';
        setTimeout(() => limitSavedMessage.style.display = 'none', 2000);
      });
    } else {
      alert('Please enter a valid positive number for the limit.');
    }
  });

  const resetBtn = document.getElementById('resetStats');
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.set({ blockCount: 0, savedAmount: 0 }, () => {
      document.getElementById('blocksTriggeredText').textContent = 'Total blocks: 0';
      document.getElementById('amountSavedText').textContent = 'Money saved: ₹0';
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const focusToggle = document.getElementById("focusToggle");

  chrome.storage.local.get("focusMode", data => {
    focusToggle.checked = Boolean(data.focusMode);
  });

  focusToggle.addEventListener("change", () => {
    chrome.storage.local.set({ focusMode: focusToggle.checked });
  });
});
