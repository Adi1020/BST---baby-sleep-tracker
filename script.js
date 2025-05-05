let sleepLog = JSON.parse(localStorage.getItem("sleepLog")) || [];
let startTime = null;

function saveLog() {
  localStorage.setItem("sleepLog", JSON.stringify(sleepLog));
}

// function startSleep() {
//   startTime = new Date();
//   alert("Sleep started at " + startTime.toLocaleTimeString());
// }
function startSleep() {
    if (startTime) {
      alert("🛑 Sleep already started at " + startTime.toLocaleTimeString() + ". End it before starting a new one.");
      return;
    }
    startTime = new Date();
    alert("✅ Sleep started at " + startTime.toLocaleTimeString());
  }
  
function endSleep() {
  if (!startTime) {
    alert("Please start sleep first!");
    return;
  }

  const endTime = new Date();
  const durationMs = endTime - startTime;
  const duration = new Date(durationMs).toISOString().substr(11, 8);

  sleepLog.push({
    date: startTime.toISOString().split("T")[0],
    startTime: startTime.toLocaleTimeString(),
    endTime: endTime.toLocaleTimeString(),
    duration: duration
  });

  saveLog();
  startTime = null;
  alert("Sleep session saved.");
}

function showToday() {
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sleepLog.filter(log => log.date === today);
  displayLogs(todaySessions, `🗓️ Summary for ${today}`);
}

function showAll() {
  const grouped = {};
  sleepLog.forEach(log => {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  });

  let output = "📊 Overall Sleep Summary by Day:\n\n";
  for (const date in grouped) {
    output += `🗓️ ${date}\n`;
    grouped[date].forEach(log => {
      output += `  💤 ${log.startTime} → ${log.endTime} (${log.duration})\n`;
    });
    const total = grouped[date].reduce((acc, log) => acc + toSeconds(log.duration), 0);
    output += `  ⏱ Total: ${formatDuration(total)} (${grouped[date].length} sessions)\n\n`;
  }

  const grandTotal = sleepLog.reduce((acc, log) => acc + toSeconds(log.duration), 0);
  output += `📊 Overall: ${sleepLog.length} sessions, ⏱ ${formatDuration(grandTotal)}`;
  document.getElementById("log-output").textContent = output;
}

function displayLogs(logs, title) {
  let output = `${title}\n\n`;
  if (!logs.length) {
    output += "No sessions found.";
  } else {
    logs.forEach(log => {
      output += `🕒 ${log.startTime} → ${log.endTime} (${log.duration})\n`;
    });
    const total = logs.reduce((acc, log) => acc + toSeconds(log.duration), 0);
    output += `\n⏱ Total: ${formatDuration(total)} (${logs.length} sessions)`;
  }
  document.getElementById("log-output").textContent = output;
}

function toSeconds(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatDuration(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function exportToExcel() {
  if (!sleepLog.length) return alert("No data to export.");

  const ws = XLSX.utils.json_to_sheet(sleepLog, {
    header: ["date", "startTime", "endTime", "duration"]
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SleepLog");
  XLSX.writeFile(wb, "baby-sleep-logs.xlsx");
}

function copySummary() {
  const text = document.getElementById("log-output").textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
}
