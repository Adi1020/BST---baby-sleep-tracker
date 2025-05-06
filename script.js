/*
  Baby Sleep Tracker
  System Version: 1.2.4 (with merged Chart.js logic)
  Last Updated: 2025-05-06
*/

let sleepLog = JSON.parse(localStorage.getItem("sleepLog")) || [];
let startTime = localStorage.getItem("startTime")
  ? new Date(localStorage.getItem("startTime"))
  : null;

// Chart.js instances
let barChartInstance, pieChartInstance, lineChartInstance, feedStackedInstance;

function saveLog() {
  localStorage.setItem("sleepLog", JSON.stringify(sleepLog));
}

function startSleep() {
  if (startTime) {
    return alert("🛑 Sleep already started at " + startTime.toLocaleTimeString());
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

  const fedBefore = confirm("🍼 Was the baby fed BEFORE this sleep session?");
  const feedStatus = fedBefore ? "before" : "after";

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
  const h = Math.floor(seconds / 3600),
        m = Math.floor((seconds % 3600) / 60),
        s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Switch between main, log, and chart views
function showView(view) {
  document.getElementById("main-ui").classList.add("hidden");
  document.getElementById("log-output").classList.add("hidden");
  document.getElementById("chart-section").classList.add("hidden");
  document.getElementById("copy-summary-btn").classList.add("hidden");
  document.getElementById("back-button").classList.remove("hidden");

  if (view === "log") {
    document.getElementById("log-output").classList.remove("hidden");
  } else if (view === "chart") {
    document.getElementById("chart-section").classList.remove("hidden");
  }
}

// Return to main tracker UI
function returnToMain() {
  document.getElementById("main-ui").classList.remove("hidden");
  document.getElementById("log-output").classList.add("hidden");
  document.getElementById("chart-section").classList.add("hidden");
  document.getElementById("copy-summary-btn").classList.add("hidden");
  document.getElementById("summary-text").textContent = "";
  document.getElementById("back-button").classList.add("hidden");

  // Reflow hack for PWA fullscreen
  const log = document.getElementById("log-output");
  log.style.display = "none";
  setTimeout(() => log.style.display = "", 10);
}

// Build and display a textual summary
function displayLogs(logs, title) {
  showView("log");

  let output = `${title}\n\n`;
  if (!logs.length) {
    output += "❌ No sessions found.";
  } else {
    const total = logs.reduce((sum, l) => sum + toSeconds(l.duration), 0);
    const avgMin = Math.round(total / (logs.length * 60));
    const typeCounts = { Nap: 0, "Mid Nap": 0, "Sleep Session": 0 };
    const feedCounts = { before: 0, after: 0, none: 0 };

    logs.forEach(l => {
      typeCounts[l.sessionType]++;
      feedCounts[l.feeding]++;
    });

    output += `🛌 ${logs.length} sessions | ⏱ Total: ${formatDuration(total)} | 🧮 Avg: ${avgMin}m\n`;
    output += `📊 Types: ${typeCounts.Nap} Nap, ${typeCounts["Mid Nap"]} Mid, ${typeCounts["Sleep Session"]} Sleep\n`;
    output += `🍽️ Feeding: ${feedCounts.before} before, ${feedCounts.after} after, ${feedCounts.none} none\n\n`;

    logs.forEach(l => {
      const durMin = Math.round(toSeconds(l.duration) / 60),
            h = Math.floor(durMin / 60),
            m = durMin % 60,
            durStr = h ? `${h}h ${m}m` : `${m}m`;
      output += `🕒 ${l.startTime.slice(0,5)} → ${l.endTime.slice(0,5)} | ${durStr} | 💤 ${l.sessionType} | 🍽️ ${l.feeding}\n`;
    });
  }

  document.getElementById("summary-text").textContent = output;
  document.getElementById("copy-summary-btn").classList.remove("hidden");
}

// Today’s summary
function showToday() {
  const today = new Date().toISOString().split("T")[0];
  displayLogs(
    sleepLog.filter(l => l.date === today),
    `🗓️ Summary for ${today}`
  );
}

// All sessions summary
function showAll() {
  const grouped = {};
  sleepLog.forEach(l => {
    grouped[l.date] = grouped[l.date] || [];
    grouped[l.date].push(l);
  });

  let output = "📊 Overall Sleep Summary by Day:\n\n";
  let totalSessions = 0, totalTime = 0;

  Object.keys(grouped).sort().forEach(date => {
    const dayLogs = grouped[date];
    const dayTotal = dayLogs.reduce((sum, l) => sum + toSeconds(l.duration), 0);
    totalSessions += dayLogs.length;
    totalTime += dayTotal;

    output += `🗓️ ${date} | 🛌 ${dayLogs.length} | ⏱ ${formatDuration(dayTotal)}\n`;
    dayLogs.forEach(l => {
      output += `  💤 ${l.startTime.slice(0,5)} → ${l.endTime.slice(0,5)} | ${Math.round(toSeconds(l.duration)/60)}m | 🍽️ ${l.feeding}\n`;
    });
    output += "\n";
  });

  output += `📅 ${Object.keys(grouped).length} days | 🛌 ${totalSessions} total | ⏱ ${formatDuration(totalTime)}`;
  displayLogs([], output);
}

// Search by date
function searchByDate() {
  const date = document.getElementById("date-input").value;
  if (!date) return alert("Please pick a date.");
  displayLogs(
    sleepLog.filter(l => l.date === date),
    `📅 Sessions for ${date}`
  );
}

// Copy summary to clipboard
function copySummary() {
  const text = document.getElementById("summary-text").textContent;
  if (!text.trim()) return alert("ℹ️ Nothing to copy.");
  navigator.clipboard.writeText(text).then(() => alert("📋 Summary copied!"));
}

// Export to Excel
function exportToExcel() {
  if (!sleepLog.length) return alert("No data to export.");
  const ws = XLSX.utils.json_to_sheet(sleepLog, {
    header: ["date", "startTime", "endTime", "duration", "feeding", "sessionType"]
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SleepLog");
  XLSX.writeFile(wb, "baby-sleep-logs.xlsx");
}

// Visual summary: Chart.js
function showChart() {
  showView("chart");

  [barChartInstance, pieChartInstance, lineChartInstance, feedStackedInstance].forEach(c => c?.destroy());

  const grouped = {}, typeTotals = { Nap: 0, "Mid Nap": 0, "Sleep Session": 0 };
  const feedByDate = {}, avgSessionLengths = {};
  const dayMap = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  sleepLog.forEach(log => {
    const d = log.date;
    grouped[d] = grouped[d] || [];
    grouped[d].push(log);
    typeTotals[log.sessionType]++;
    feedByDate[d] = feedByDate[d] || { before:0, after:0, none:0 };
    feedByDate[d][log.feeding]++;
    avgSessionLengths[d] = avgSessionLengths[d] || [];
    avgSessionLengths[d].push(toSeconds(log.duration));
  });

  const dates = Object.keys(grouped).sort();
  const ctx = id => document.getElementById(id).getContext("2d");

  barChartInstance = new Chart(ctx("barChart"), {
    type: "bar",
    data: {
      labels: dates,
      datasets: [{
        label: "Total Sleep (min)",
        data: dates.map(d => grouped[d].reduce((s,l)=>s+toSeconds(l.duration),0)/60)
      }]
    }
  });

  pieChartInstance = new Chart(ctx("typePieChart"), {
    type: "pie",
    data: {
      labels: Object.keys(typeTotals),
      datasets: [{ data: Object.values(typeTotals) }]
    }
  });

  const avg7 = dates.map((_,i) => {
    const slice = dates.slice(Math.max(0,i-6), i+1);
    const sum = slice.reduce((s,d)=>s + avgSessionLengths[d].reduce((a,b)=>a+b,0), 0);
    const cnt = slice.reduce((c,d)=>c + avgSessionLengths[d].length, 0);
    return cnt ? Math.round(sum/cnt/60) : 0;
  });

  lineChartInstance = new Chart(ctx("lineChart"), {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        { label: "Avg Session (min)", data: dates.map(d => Math.round(avgSessionLengths[d].reduce((a,b)=>a+b,0)/avgSessionLengths[d].length/60)) },
        { label: "7-Day Avg", data: avg7, borderDash: [5,5] }
      ]
    }
  });

  feedStackedInstance = new Chart(ctx("feedStackedChart"), {
    type: "bar",
    data: {
      labels: dates,
      datasets: ["before","after","none"].map(f => ({
        label: `Fed ${f}`, 
        data: dates.map(d => feedByDate[d]?.[f] || 0)
      }))
    },
    options: { scales: { x: { stacked:true }, y: { stacked:true } } }
  });
}

// Dark mode toggle
function toggleDarkMode() {
  const on = document.getElementById("darkToggle").checked;
  document.body.classList.toggle("dark", on);
  localStorage.setItem("darkMode", on ? "true" : "false");
}

// On load
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkToggle").checked = saved;
  document.body.classList.toggle("dark", saved);
  document.getElementById("back-button").classList.add("hidden");
});
