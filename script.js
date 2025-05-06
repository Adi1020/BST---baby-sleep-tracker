/*
  Baby Sleep Tracker
  Version: 1.2.1
  Last Updated: 2025-05-06 
  Features:
  - Smart sleep session tracking
  - Feeding prompt on sleep end (before/after)
  - Session type categorization
  - Visual summaries with Chart.js (bar, pie, line, stacked)
  - Summary and chart views have back navigation
  - Default mode hides back button
  - Clipboard copy, Excel export
  - Dark mode toggle (persisted)
  - Responsive PWA mobile design
*/

let sleepLog = JSON.parse(localStorage.getItem("sleepLog")) || [];
let startTime = localStorage.getItem("startTime") ? new Date(localStorage.getItem("startTime")) : null;

function saveLog() {
  localStorage.setItem("sleepLog", JSON.stringify(sleepLog));
}

function startSleep() {
  if (startTime) {
    alert("🛑 Sleep already started at " + startTime.toLocaleTimeString());
    return;
  }
  startTime = new Date();
  localStorage.setItem("startTime", startTime.toISOString());
  alert("✅ Sleep started at " + startTime.toLocaleTimeString());
}

function endSleep() {
  if (!startTime) return alert("Please start sleep first.");

  const endTime = new Date();
  const durationMs = endTime - startTime;
  const durationStr = new Date(durationMs).toISOString().substr(11, 8);
  const durationSec = durationMs / 1000;

  let sessionType = "Nap";
  if (durationSec >= 3600) sessionType = "Sleep Session";
  else if (durationSec >= 1800) sessionType = "Mid Nap";

  let feedStatus = "none";
  const confirmBefore = confirm("🍼 Was the baby fed BEFORE this sleep session?");
  feedStatus = confirmBefore ? "before" : "after";

  sleepLog.push({
    date: startTime.toISOString().split("T")[0],
    startTime: startTime.toLocaleTimeString(),
    endTime: endTime.toLocaleTimeString(),
    duration: durationStr,
    feeding: feedStatus,
    sessionType
  });

  saveLog();
  localStorage.removeItem("startTime");
  startTime = null;
  alert("✅ Sleep session saved.");
}

function toSeconds(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function showView(viewId) {
  document.getElementById("main-ui").classList.add("hidden");
  document.getElementById("log-output").classList.add("hidden");
  document.getElementById("chart-section").classList.add("hidden");
  document.getElementById("back-button").classList.remove("hidden");

  if (viewId === "log") {
    document.getElementById("log-output").classList.remove("hidden");
  } else if (viewId === "chart") {
    document.getElementById("chart-section").classList.remove("hidden");
  }
}

function returnToMain() {
  document.getElementById("main-ui").classList.remove("hidden");
  document.getElementById("log-output").classList.add("hidden");
  document.getElementById("chart-section").classList.add("hidden");
  document.getElementById("back-button").classList.add("hidden");
}

function displayLogs(logs, title) {
  let output = `${title}\n\n`;
  if (!logs.length) {
    output += "❌ No sessions found.";
  } else {
    const total = logs.reduce((acc, log) => acc + toSeconds(log.duration), 0);
    const avgMin = Math.round(total / logs.length / 60);
    const typeCounts = { Nap: 0, "Mid Nap": 0, "Sleep Session": 0 };
    const feedCounts = { before: 0, after: 0, none: 0 };

    logs.forEach(log => {
      typeCounts[log.sessionType]++;
      feedCounts[log.feeding]++;
    });

    output += `🛌 ${logs.length} sessions | ⏱ Total: ${formatDuration(total)} | 🧮 Avg: ${avgMin}m\n`;
    output += `📊 Types: ${typeCounts.Nap} Nap, ${typeCounts["Mid Nap"]} Mid, ${typeCounts["Sleep Session"]} Sleep\n`;
    output += `🍽️ Feeding: ${feedCounts.before} before, ${feedCounts.after} after, ${feedCounts.none} none\n\n`;

    logs.forEach(log => {
      const durSec = toSeconds(log.duration);
      const durMin = Math.round(durSec / 60);
      const h = Math.floor(durMin / 60);
      const min = durMin % 60;
      const durStr = h ? `${h}h ${min}m` : `${min}m`;
      output += `🕒 ${log.startTime.slice(0,5)} → ${log.endTime.slice(0,5)} | ${durStr} | 💤 ${log.sessionType} | 🍽️ ${log.feeding}\n`;
    });
  }

  document.getElementById("log-output").textContent = output;
  showView("log");
}

function showToday() {
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = sleepLog.filter(log => log.date === today);
  displayLogs(todayLogs, `🗓️ Summary for ${today}`);
}

function showAll() {
  const grouped = {};
  sleepLog.forEach(log => {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  });

  let output = "📊 Overall Sleep Summary by Day:\n\n";
  let totalSessions = 0;
  let totalTime = 0;

  for (const date in grouped) {
    const dayLogs = grouped[date];
    const dayTotal = dayLogs.reduce((sum, log) => sum + toSeconds(log.duration), 0);
    totalSessions += dayLogs.length;
    totalTime += dayTotal;

    output += `🗓️ ${date} | 🛌 ${dayLogs.length} | ⏱ ${formatDuration(dayTotal)}\n`;
    dayLogs.forEach(log => {
      output += `  💤 ${log.startTime.slice(0,5)} → ${log.endTime.slice(0,5)} | ${Math.round(toSeconds(log.duration)/60)}m | 🍽️ ${log.feeding}\n`;
    });
    output += "\n";
  }

  output += `📅 ${Object.keys(grouped).length} days | 🛌 ${totalSessions} total | ⏱ ${formatDuration(totalTime)}`;
  document.getElementById("log-output").textContent = output;
  showView("log");
}

function searchByDate() {
  const date = document.getElementById("date-input").value;
  if (!date) return alert("Please pick a date.");
  const logs = sleepLog.filter(log => log.date === date);
  displayLogs(logs, `📅 Sessions for ${date}`);
}

function exportToExcel() {
  if (!sleepLog.length) return alert("No data to export.");
  const ws = XLSX.utils.json_to_sheet(sleepLog, {
    header: ["date", "startTime", "endTime", "duration", "feeding", "sessionType"]
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SleepLog");
  XLSX.writeFile(wb, "baby-sleep-logs.xlsx");
}

function copySummary() {
  const text = document.getElementById("log-output").textContent;
  navigator.clipboard.writeText(text).then(() => alert("📋 Copied to clipboard!"));
}

function showChart() {
  showView("chart");

  const ctxs = [
    "barChart", "typePieChart", "lineChart", "feedStackedChart"
  ];
  ctxs.forEach(id => {
    const canvas = document.getElementById(id);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  });

  const grouped = {}, typeTotals = { Nap: 0, "Mid Nap": 0, "Sleep Session": 0 };
  const feedByDate = {}, avgSessionLengths = {}, dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekBuckets = Object.fromEntries(dayMap.map(d => [d, 0]));

  sleepLog.forEach(log => {
    const d = log.date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(log);
    typeTotals[log.sessionType]++;
    feedByDate[d] = feedByDate[d] || { before: 0, after: 0, none: 0 };
    feedByDate[d][log.feeding]++;
    avgSessionLengths[d] = avgSessionLengths[d] || [];
    avgSessionLengths[d].push(toSeconds(log.duration));
    weekBuckets[dayMap[new Date(d).getDay()]] += toSeconds(log.duration) / 60;
  });

  const dates = Object.keys(grouped).sort();

  new Chart(barChart, {
    type: "bar",
    data: {
      labels: dates,
      datasets: [{
        label: "Total Sleep (min)",
        data: dates.map(d => grouped[d].reduce((s,l)=>s+toSeconds(l.duration),0)/60),
        backgroundColor: "#4fc3f7"
      }]
    },
    options: { plugins: { title: { display: true, text: "📊 Total Sleep per Day" } } }
  });

  new Chart(typePieChart, {
    type: "pie",
    data: {
      labels: Object.keys(typeTotals),
      datasets: [{
        data: Object.values(typeTotals),
        backgroundColor: ["#81c784", "#ffb74d", "#9575cd"]
      }]
    },
    options: { plugins: { title: { display: true, text: "🧁 Session Type Breakdown" } } }
  });

  const avg7 = [];
  for (let i = 0; i < dates.length; i++) {
    const last7 = dates.slice(Math.max(0, i - 6), i + 1);
    const total = last7.reduce((sum, d) =>
      sum + (avgSessionLengths[d]?.reduce((a,b)=>a+b,0) || 0), 0);
    const count = last7.reduce((sum, d) =>
      sum + (avgSessionLengths[d]?.length || 0), 0);
    avg7.push(Math.round(total / count / 60));
  }

  new Chart(lineChart, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "Avg Session (min)",
        data: dates.map(d =>
          Math.round(avgSessionLengths[d].reduce((a,b)=>a+b,0)/avgSessionLengths[d].length/60)
        ),
        borderColor: "#ff7043",
        fill: false
      }, {
        label: "7-Day Avg",
        data: avg7,
        borderColor: "#9c27b0",
        borderDash: [5, 5],
        fill: false
      }]
    },
    options: { plugins: { title: { display: true, text: "📈 Avg Session Duration by Day" } } }
  });

  new Chart(feedStackedChart, {
    type: "bar",
    data: {
      labels: dates,
      datasets: ["before", "after", "none"].map((f, i) => ({
        label: `Fed ${f}`,
        data: dates.map(d => feedByDate[d]?.[f] || 0),
        backgroundColor: ["#aed581", "#ff8a65", "#90a4ae"][i]
      }))
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "🍽️ Feeding Status per Day" }
      },
      scales: { x: { stacked: true }, y: { stacked: true } }
    }
  });
}

// DARK MODE
function toggleDarkMode() {
  const enabled = document.getElementById("darkToggle").checked;
  document.body.classList.toggle("dark", enabled);
  localStorage.setItem("darkMode", enabled ? "true" : "false");
}

window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkToggle").checked = saved;
  document.body.classList.toggle("dark", saved);
});
