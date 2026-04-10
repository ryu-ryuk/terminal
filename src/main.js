import { animate, stagger, svg } from "animejs";
import { gsap } from "gsap";
import { Draggable, MotionPathPlugin, Physics2DPlugin, ScrollTrigger } from "gsap/all";
import "./style.css";

const API_BASE = import.meta.env.VITE_API_URL;

gsap.registerPlugin(ScrollTrigger, Draggable, MotionPathPlugin, Physics2DPlugin);

function initTimeline() {
  const timelineNodes = document.querySelectorAll('.timeline-node');
  const journeyNavs = document.querySelectorAll('.journey-nav');
  const timelineEntries = document.querySelectorAll('.timeline-entry');
  const timelineProgress = document.querySelector('.timeline-progress');
  const progressMap = { '2023': '0%', '2024': '50%', '2025': '100%' };

  function showEntry(year) {
    timelineEntries.forEach(e => e.classList.add('hidden'));
    timelineNodes.forEach(n => n.classList.toggle('active', n.dataset.year === year));
    journeyNavs.forEach(n => n.classList.toggle('active', n.dataset.year === year));
    document.getElementById(`entry-${year}`)?.classList.remove('hidden');
    if (timelineProgress) {
      timelineProgress.style.transition = 'width 0.5s ease';
      timelineProgress.style.width = progressMap[year] || '0%';
    }
  }

  timelineNodes.forEach(n => n.addEventListener('click', () => n.dataset.year && showEntry(n.dataset.year)));
  journeyNavs.forEach(n => n.addEventListener('click', () => n.dataset.year && showEntry(n.dataset.year)));
  showEntry('2025');
}

class Terminal {
  constructor() {
    this.overlay = null;
    this.window = null;
    this.input = null;
    this.output = null;
    this.form = null;
    this.acEl = null;
    this.isMaximized = false;
    this.hasBooted = false;
    this._busy = false;
    this.currentTheme = "green";

    this.fs = {
      "about.txt": "Linux enthusiast. Rust developer. Cybersecurity learner.\nBuilding things that matter (and some that don't).\nCurrently at: OmniDimension — building voice AI pipelines.",
      "README.md": "# ryu's terminal portfolio\n\nWelcome. This site is a terminal.\nType `help` to see what's available.\nTry `neofetch` for the full vibe.\n\nGitHub: github.com/ryu-ryuk\nBlog:   blogs.alokranjan.me",
      ".secrets": {
        ".env": "DATABASE_URL=postgres://ryu:hunter2@localhost/prod\nAPI_KEY=sk-definitely-real-key-abc123\nSECRET_KEY=i-use-arch-btw\nPASSWORD=correcthorsebatterystaple",
        "manifesto.txt": "1. Arch Linux or nothing.\n2. Neovim is a lifestyle.\n3. If it compiles, ship it.\n4. The terminal is the only UI you need.\n5. btw I use Arch.",
      },
      projects: {
        "yoru.md": "# yoru — private pastebin\nA minimal, self-hosted paste service.\nStack: Go · PostgreSQL · Docker · Traefik · AWS\nStatus: LIVE\nURL: github.com/ryu-ryuk/yoru",
        "lenrs.md": "# lenrs — TUI OCR\nTerminal-based OCR tool with live preview.\nStack: Rust · Tesseract · Ratatui\nStatus: WIP",
        "call_handler.md": "# call_handler — voice AI pipeline\nReal-time voice processing with noise cancellation.\nStack: Python · FastAPI · NVIDIA CUDA · Silero VAD · DeepFilterNet\nStatus: INTERNAL (OmniDimension)",
        "terminal.md": "# terminal.xyz — this site\nYou are currently inside this project.\nStack: Vite · GSAP · Tailwind · Anime.js\nStatus: LIVE\nMeta level: maximum.",
      },
      skills: {
        "languages.md": "Rust · Python · Go · JavaScript · C · Bash",
        "tools.md": "Neovim · Linux · Docker · Git · GSAP · FastAPI · PostgreSQL",
      },
      links: {
        "github.url": "https://github.com/ryu-ryuk",
        "blog.url": "https://blogs.alokranjan.me",
      },
      music: {
        "now-playing.sh": "#!/bin/bash\n# fetches spotify now-playing\ncurl $API_BASE/api/spotify | jq '.song'",
      },
    };

    this.cwd = [];
    this.history = [];
    this.historyIndex = -1;
    this.savedInput = "";
    this.tabCandidates = [];
    this.tabIndex = 0;
    this.acCandidates = [];
    this.acIndex = -1;

    this.themes = {
      green: "#33FF33",
      amber: "#FFB000",
      cyan:  "#00E5FF",
      pink:  "#F5C2E7",
    };

    this.cmdDescs = {
      help:     "list all commands",
      clear:    "clear terminal output",
      ls:       "list directory contents  [-l] [-a]",
      cd:       "change directory",
      cat:      "print file contents",
      pwd:      "print working directory",
      whoami:   "print current user",
      neofetch: "system info with ASCII art",
      fortune:  "random fortune cookie",
      sudo:     "superuser command",
      skills:   "show skills with progress bars",
      projects: "list projects with details",
      contact:  "show contact card",
      open:     "open a page or URL",
      spotify:  "show now playing track",
      theme:    "change terminal color theme",
      hack:     "totally legitimate network scan",
      ping:     "ping a host",
      date:     "show current date and time",
      history:  "show command history",
      man:      "show command manual page",
      alias:    "show command aliases",
      echo:     "print text to terminal",
      curl:     "fetch a URL (trust me)",
      htop:     "interactive process viewer",
      nvim:     "open neovim (good luck leaving)",
      git:      "version control operations",
      pacman:   "arch linux package manager",
      nmap:     "network exploration tool",
      uname:    "print system information",
      uptime:   "show system uptime",
      banner:   "print large ASCII text",
      matrix:   "enter the matrix",
      exit:     "close this terminal",
    };

    this.aliases = {
      cls: "clear", quit: "exit", logout: "exit",
      vim: "nvim", vi: "nvim", nano: "nvim",
      ll: "ls -l", la: "ls -a",
    };

    this.manPages = {
      ls:   "ls [OPTIONS] [PATH]\n  List directory contents.\n  -l    long listing format with permissions and size\n  -a    include hidden files (dotfiles)\n  -la   both flags combined",
      cd:   "cd [PATH]\n  Change the current working directory.\n  ~     return to home directory\n  ..    go up one level",
      cat:  "cat [FILE]\n  Print file contents to the terminal.\n  Supports paths relative to cwd.",
      pwd:  "pwd\n  Print the current working directory as an absolute path.",
      man:  "man [COMMAND]\n  Display the manual page for a command.\n  Usage: man ls",
      theme:"theme [NAME]\n  Switch the terminal color theme.\n  Available: green · amber · cyan · pink\n  Usage: theme cyan",
      open: "open [TARGET]\n  Open a page or URL.\n  Targets: about · projects · contact · github · blog\n  Usage: open projects",
      hack: "hack [TARGET]\n  Performs a totally legitimate network audit.\n  No actual systems are harmed in the making of this command.",
      ping: "ping [HOST]\n  Send ICMP echo requests to a host.\n  Usage: ping google.com",
      sudo: "sudo [COMMAND]\n  Execute a command as superuser.\n  Try: sudo give me coffee",
    };
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  set busy(v) {
    this._busy = v;
    if (this.input) this.input.disabled = v;
  }
  get busy() { return this._busy; }

  // ── INIT ──────────────────────────────────────────────────────────────────

  init() {
    this.overlay = document.getElementById("terminal-overlay");
    this.window  = document.getElementById("terminal-window");
    this.input   = document.getElementById("terminal-input");
    this.output  = document.getElementById("terminal-output");
    this.form    = document.getElementById("terminal-form");
    this.acEl    = document.getElementById("terminal-autocomplete");
    if (!this.overlay || !this.window || !this.input || !this.output || !this.form) return false;
    this.bindEvents();
    this.initDraggable();
    return true;
  }

  initDraggable() {
    const header = document.getElementById("terminal-header");
    if (!header) return;
    let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;

    header.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") || e.target.closest(".term-pill")) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const s = this.window.style;
      ox = parseFloat(s.left) || 0;
      oy = parseFloat(s.top) || 0;
      if (!s.left) {
        const r = this.window.getBoundingClientRect();
        ox = r.left; oy = r.top;
        this.window.style.margin = "0";
        this.window.style.position = "fixed";
        this.window.style.left = ox + "px";
        this.window.style.top = oy + "px";
      }
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      this.window.style.left = (ox + e.clientX - startX) + "px";
      this.window.style.top  = (oy + e.clientY - startY) + "px";
    });

    document.addEventListener("mouseup", () => { dragging = false; });
  }

  bindEvents() {
    document.getElementById("close-terminal")?.addEventListener("click", () => this.hide());
    document.getElementById("minimize-terminal")?.addEventListener("click", () => this.hide());
    document.getElementById("maximize-terminal")?.addEventListener("click", () => this.toggleMaximize());
    this.overlay?.addEventListener("click", (e) => { if (e.target === this.overlay) this.hide(); });
    this.window?.addEventListener("click", () => this.input.focus());
    this.form?.addEventListener("submit", (e) => this.handleCommand(e));

    document.querySelectorAll(".term-pill").forEach(pill => {
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        this.applyTheme(pill.dataset.theme);
      });
    });

    this.input.addEventListener("input", () => this.updateAC());

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { this.hide(); return; }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.acCandidates.length && !this.acEl.classList.contains("hidden")) {
          this.acIndex = Math.min(this.acIndex + 1, this.acCandidates.length - 1);
          this.renderAC();
          return;
        }
        if (this.historyIndex === -1) return;
        if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.input.value = this.history[this.historyIndex]; }
        else { this.historyIndex = -1; this.input.value = this.savedInput; }
        this.resetTab(); this.updateAC();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.acCandidates.length && !this.acEl.classList.contains("hidden") && this.acIndex > 0) {
          this.acIndex--;
          this.renderAC();
          return;
        }
        if (!this.history.length) return;
        if (this.historyIndex === -1) { this.savedInput = this.input.value; this.historyIndex = this.history.length - 1; }
        else if (this.historyIndex > 0) this.historyIndex--;
        this.input.value = this.history[this.historyIndex];
        this.resetTab(); this.updateAC();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (this.acCandidates.length && this.acIndex >= 0) {
          this.input.value = this.acCandidates[this.acIndex].cmd + " ";
          this.hideAC(); this.resetTab();
          return;
        }
        this.handleTab();
        return;
      }

      if (e.ctrlKey && e.key === "l") { e.preventDefault(); this.commands.clear.call(this, []); return; }
      if (e.ctrlKey && e.key === "c") { e.preventDefault(); this.writeLine("^C", "term-dim"); this.input.value = ""; this.hideAC(); return; }

      this.resetTab();
    });
  }

  // ── SHOW / HIDE ───────────────────────────────────────────────────────────

  show() {
    this.overlay.classList.remove("hidden");
    requestAnimationFrame(() => {
      this.overlay.classList.add("terminal-visible");
      this.window.classList.add("terminal-window-visible");
      if (!this.hasBooted) {
        this.boot().then(() => this.input.focus());
      } else {
        this.input.focus();
      }
    });
  }

  hide() {
    this.hideAC();
    this.overlay.classList.remove("terminal-visible");
    this.window.classList.remove("terminal-window-visible");
    setTimeout(() => this.overlay.classList.add("hidden"), 300);
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
    this.window.classList.toggle("terminal-maximized", this.isMaximized);
    if (this.isMaximized && typeof Draggable !== "undefined") {
      gsap.set(this.window, { x: 0, y: 0 });
    }
  }

  // ── BOOT SEQUENCE ─────────────────────────────────────────────────────────

  async boot() {
    this.hasBooted = true;
    while (this.output.firstChild) this.output.removeChild(this.output.firstChild);
    await this.sleep(120);
    this.writeLine("welcome.", "term-accent");
    await this.sleep(80);
    this.writeLine("try me  ;)", "term-dim");
  }

  // ── OUTPUT ────────────────────────────────────────────────────────────────

  writeLine(text, cls = "") {
    const div = document.createElement("div");
    div.className = "term-line" + (cls ? " " + cls : "");
    div.textContent = text;
    this.output.appendChild(div);
    return div;
  }

  writeBlank() { this.writeLine(""); }

  writeSpan(spans, wrapCls = "") {
    const div = document.createElement("div");
    div.className = "term-line" + (wrapCls ? " " + wrapCls : "");
    for (const s of spans) {
      if (s.href) {
        const a = document.createElement("a");
        a.href = s.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = s.text;
        a.className = "term-link" + (s.cls ? " " + s.cls : "");
        div.appendChild(a);
      } else {
        const span = document.createElement("span");
        span.textContent = s.text;
        if (s.cls) span.className = s.cls;
        div.appendChild(span);
      }
    }
    this.output.appendChild(div);
    return div;
  }

  // backward compat — called from Konami code handler
  writeOutput(text, className = "") {
    for (const line of text.split("\n")) this.writeLine(line, className);
  }

  clearOutput() {
    while (this.output.firstChild) this.output.removeChild(this.output.firstChild);
  }

  scroll() { this.output.scrollTop = this.output.scrollHeight; }

  // ── PROMPT ────────────────────────────────────────────────────────────────

  promptStr() { return (this.cwd.length ? "~/" + this.cwd.join("/") : "~") + " $"; }

  updatePrompt() {
    const p = document.getElementById("terminal-prompt");
    if (p) p.textContent = this.promptStr();
    const t = document.getElementById("terminal-title");
    if (t) t.textContent = "ryu@archy: " + (this.cwd.length ? "~/" + this.cwd.join("/") : "~");
  }

  // ── FILESYSTEM ────────────────────────────────────────────────────────────

  resolveDir(segments) {
    let node = this.fs;
    for (const seg of segments) {
      if (typeof node !== "object" || node === null || !(seg in node)) return null;
      node = node[seg];
    }
    return typeof node === "object" ? node : null;
  }

  currentDir() { return this.resolveDir(this.cwd) || this.fs; }

  resolvePath(pathStr) {
    if (!pathStr || pathStr === "~") return [];
    const parts = pathStr.startsWith("~/") ? pathStr.slice(2).split("/")
      : pathStr.startsWith("/") ? pathStr.slice(1).split("/")
      : [...this.cwd, ...pathStr.split("/")];
    const resolved = [];
    for (const p of parts) {
      if (p === "" || p === ".") continue;
      if (p === "..") { resolved.pop(); continue; }
      resolved.push(p);
    }
    return resolved;
  }

  // ── AUTOCOMPLETE ──────────────────────────────────────────────────────────

  updateAC() {
    const val = this.input.value;
    const parts = val.split(/\s+/);
    if (parts.length > 1 || !val) { this.hideAC(); return; }
    const prefix = parts[0].toLowerCase();
    if (!prefix) { this.hideAC(); return; }
    this.acCandidates = Object.keys(this.cmdDescs)
      .filter(c => c.startsWith(prefix) && c !== prefix)
      .slice(0, 6)
      .map(c => ({ cmd: c, desc: this.cmdDescs[c] }));
    if (!this.acCandidates.length) { this.hideAC(); return; }
    this.acIndex = 0;
    this.renderAC();
  }

  renderAC() {
    if (!this.acEl) return;
    while (this.acEl.firstChild) this.acEl.removeChild(this.acEl.firstChild);
    this.acCandidates.forEach((c, i) => {
      const item = document.createElement("div");
      item.className = "terminal-ac-item" + (i === this.acIndex ? " active" : "");
      const cmd = document.createElement("span");
      cmd.className = "terminal-ac-cmd";
      cmd.textContent = c.cmd;
      const desc = document.createElement("span");
      desc.className = "terminal-ac-desc";
      desc.textContent = c.desc;
      item.appendChild(cmd);
      item.appendChild(desc);
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.input.value = c.cmd + " ";
        this.hideAC();
        this.input.focus();
      });
      this.acEl.appendChild(item);
    });
    this.acEl.classList.remove("hidden");
  }

  hideAC() {
    this.acCandidates = [];
    this.acIndex = -1;
    if (this.acEl) this.acEl.classList.add("hidden");
  }

  // ── TAB COMPLETION ────────────────────────────────────────────────────────

  handleTab() {
    const val = this.input.value;
    if (!this.tabCandidates.length) {
      const parts = val.split(" ");
      if (parts.length <= 1) {
        this.tabCandidates = Object.keys(this.cmdDescs).filter(c => c.startsWith(parts[0] || ""));
      } else {
        const partial = parts[parts.length - 1] || "";
        const dir = this.currentDir();
        if (dir) this.tabCandidates = Object.keys(dir).filter(f => f.startsWith(partial));
      }
      this.tabIndex = 0;
    }
    if (!this.tabCandidates.length) return;
    const parts = val.split(" ");
    if (parts.length <= 1) this.input.value = this.tabCandidates[this.tabIndex] + " ";
    else { parts[parts.length - 1] = this.tabCandidates[this.tabIndex]; this.input.value = parts.join(" "); }
    this.tabIndex = (this.tabIndex + 1) % this.tabCandidates.length;
  }

  resetTab() { this.tabCandidates = []; this.tabIndex = 0; }

  // ── THEME ─────────────────────────────────────────────────────────────────

  applyTheme(name) {
    if (!this.themes[name]) return;
    this.currentTheme = name;
    const color = this.themes[name];
    document.documentElement.style.setProperty("--terminal-green", color);
    this.window.dataset.theme = name;
    this.writeLine(`theme set: ${name}  (${color})`, "term-dim");
    this.scroll();
  }

  // ── COMMAND HANDLER ───────────────────────────────────────────────────────

  async handleCommand(event) {
    event.preventDefault();
    const raw = this.input.value.trim();
    if (!raw || this.busy) return;

    this.hideAC();
    this.history.push(raw);
    this.historyIndex = -1;
    this.savedInput = "";
    this.input.value = "";
    this.resetTab();

    // alias resolution
    let resolved = raw;
    for (const [alias, target] of Object.entries(this.aliases)) {
      if (raw === alias || raw.startsWith(alias + " ")) {
        resolved = target + raw.slice(alias.length);
        break;
      }
    }

    const parts = resolved.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    this.writeSpan([
      { text: this.promptStr() + " ", cls: "term-prompt-echo" },
      { text: raw, cls: "term-cmd-echo" },
    ]);

    if (this.commands[cmd]) {
      const result = this.commands[cmd].call(this, args);
      if (result instanceof Promise) {
        await result;
      } else if (result) {
        for (const line of result.split("\n")) this.writeLine(line);
      }
    } else {
      this.writeLine(`bash: ${cmd}: command not found. Try 'help'`, "term-error");
    }

    this.scroll();
    this.updatePrompt();
  }

  // ── COMMANDS ──────────────────────────────────────────────────────────────

  commands = {

    help: function() {
      const categories = [
        { label: "NAVIGATION", cmds: ["ls","cd","cat","pwd"] },
        { label: "PORTFOLIO",  cmds: ["neofetch","skills","projects","contact","spotify","open"] },
        { label: "SYSTEM",     cmds: ["whoami","uname","uptime","date","history","alias","echo"] },
        { label: "TOOLS",      cmds: ["ping","curl","nmap","htop","git","pacman","nvim"] },
        { label: "FUN",        cmds: ["hack","matrix","banner","fortune","sudo","theme"] },
        { label: "META",       cmds: ["man","clear","exit"] },
      ];
      this.writeLine("─".repeat(48), "term-dim");
      this.writeSpan([{ text: "  ryu@archy — available commands", cls: "term-accent" }]);
      this.writeLine("─".repeat(48), "term-dim");
      for (const cat of categories) {
        this.writeBlank();
        this.writeLine("  " + cat.label, "term-header");
        for (const c of cat.cmds) {
          const desc = this.cmdDescs[c] || "";
          this.writeSpan([
            { text: "    " + c.padEnd(12), cls: "term-accent" },
            { text: desc, cls: "term-dim" },
          ]);
        }
      }
      this.writeBlank();
      this.writeLine("─".repeat(48), "term-dim");
      this.writeLine("  tip: Tab to complete · ↑↓ history · Ctrl+L clear · Esc close", "term-dim");
      return "";
    },

    clear: function() { this.clearOutput(); return ""; },

    ls: function(args) {
      const showHidden = args.includes("-a") || args.includes("-la") || args.includes("-al");
      const longFmt    = args.includes("-l") || args.includes("-la") || args.includes("-al");
      const pathArg = args.find(a => !a.startsWith("-"));
      const dir = this.resolveDir(pathArg ? this.resolvePath(pathArg) : this.cwd);
      if (!dir) return "ls: no such directory";

      const entries = Object.entries(dir).filter(([k]) => showHidden || !k.startsWith("."));

      if (longFmt) {
        this.writeLine("total " + entries.length, "term-dim");
        for (const [k, v] of entries) {
          const isDir = typeof v === "object";
          const perms = isDir ? "drwxr-xr-x" : "-rw-r--r--";
          const size  = isDir ? "-" : String(v.length).padStart(5);
          const date  = "Apr 11 2026";
          this.writeSpan([
            { text: perms + "  ryu  ryu  " + size.padStart(6) + "  " + date + "  ", cls: "term-dim" },
            { text: k + (isDir ? "/" : ""), cls: isDir ? "term-dir" : (k.startsWith(".") ? "term-hidden" : "term-file") },
          ]);
        }
      } else {
        const chunks = [];
        for (const [k, v] of entries) {
          const isDir = typeof v === "object";
          chunks.push({ text: k + (isDir ? "/  " : "  "), cls: isDir ? "term-dir" : (k.startsWith(".") ? "term-hidden" : "term-file") });
        }
        // render in rows of 4
        for (let i = 0; i < chunks.length; i += 4) {
          this.writeSpan(chunks.slice(i, i + 4).map(c => ({ ...c, text: c.text.padEnd(20) })));
        }
      }
      return "";
    },

    cd: function(args) {
      const path = args[0];
      if (!path || path === "~") { this.cwd = []; this.updatePrompt(); return ""; }
      if (path === "..") { this.cwd.pop(); this.updatePrompt(); return ""; }
      const resolved = this.resolvePath(path);
      if (!this.resolveDir(resolved)) return `cd: no such directory: ${path}`;
      this.cwd = resolved;
      this.updatePrompt();
      return "";
    },

    cat: function(args) {
      if (!args[0]) return "cat: missing file operand";
      let node = this.fs;
      for (const seg of this.resolvePath(args[0])) {
        if (typeof node !== "object" || !(seg in node)) return `cat: ${args[0]}: No such file`;
        node = node[seg];
      }
      if (typeof node !== "string") return "cat: is a directory";
      for (const line of node.split("\n")) {
        if (line.startsWith("#")) this.writeLine(line, "term-accent");
        else this.writeLine(line);
      }
      return "";
    },

    pwd:    function() { return "~" + (this.cwd.length ? "/" + this.cwd.join("/") : ""); },
    whoami: function() { return "ryu"; },

    echo: function(args) {
      const text = args.join(" ");
      if (text === "btw") return "I use Arch";
      if (text === "hello") return "hello, world.";
      if (!text) return "";
      return text;
    },

    date: function() {
      return new Date().toString();
    },

    uname: function(args) {
      if (args.includes("-a")) return "Linux archy 6.19.11-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux";
      return "Linux";
    },

    uptime: function() {
      const d = Math.floor(Math.random() * 30) + 1;
      const h = Math.floor(Math.random() * 24);
      const m = Math.floor(Math.random() * 60);
      return ` ${new Date().toTimeString().slice(0,8)} up ${d} days, ${h}:${String(m).padStart(2,"0")},  1 user,  load average: 0.42, 0.38, 0.21`;
    },

    history: function() {
      if (!this.history.length) return "no history yet";
      this.history.forEach((cmd, i) => {
        this.writeLine(`  ${String(i + 1).padStart(3)}  ${cmd}`, "term-dim");
      });
      return "";
    },

    alias: function() {
      this.writeLine("  Defined aliases:", "term-dim");
      for (const [a, t] of Object.entries(this.aliases)) {
        this.writeSpan([
          { text: "    " + a.padEnd(14), cls: "term-accent" },
          { text: "→  " + t, cls: "term-dim" },
        ]);
      }
      return "";
    },

    man: function(args) {
      const cmd = args[0];
      if (!cmd) return "What manual page do you want?";
      const page = this.manPages[cmd];
      if (!page) return `No manual entry for ${cmd}`;
      this.writeLine(`MANUAL: ${cmd.toUpperCase()}(1)`, "term-header");
      this.writeBlank();
      for (const line of page.split("\n")) this.writeLine("  " + line, "term-dim");
      return "";
    },

    neofetch: function() {
      const logo = [
        "        /\\        ",
        "       /  \\       ",
        "      /    \\      ",
        "     / /\\  /\\     ",
        "    / /  \\/  \\    ",
        "   / / /\\ \\  /    ",
        "  /_/ /  \\_\\/     ",
        " /_________/      ",
      ];
      const color = this.themes[this.currentTheme];
      const stats = [
        ["ryu", "archy"],
        null,
        ["OS",       "Arch Linux x86_64"],
        ["Kernel",   "6.19.11-arch1-1"],
        ["Shell",    "zsh 5.9"],
        ["WM",       "Hyprland"],
        ["Terminal", "kitty"],
        ["Editor",   "Neovim"],
        ["GPU",      "NVIDIA RTX 3060Ti"],
        ["CPU",      "AMD Ryzen 9 6900HX"],
        ["Memory",   "16 GB DDR5"],
        ["Uptime",   "∞"],
        null,
        ["Theme",    this.currentTheme + "  (" + color + ")"],
      ];
      this.writeBlank();
      const rows = Math.max(logo.length, stats.length);
      for (let i = 0; i < rows; i++) {
        const logoStr = logo[i] || "                  ";
        const stat = stats[i];
        if (stat === null) {
          this.writeSpan([
            { text: logoStr, cls: "term-neofetch-logo" },
            { text: "─".repeat(32), cls: "term-dim" },
          ]);
        } else if (stat[0] === "ryu") {
          this.writeSpan([
            { text: logoStr, cls: "term-neofetch-logo" },
            { text: "ryu", cls: "term-accent" },
            { text: "@", cls: "term-dim" },
            { text: "archy", cls: "term-accent" },
          ]);
        } else {
          this.writeSpan([
            { text: logoStr, cls: "term-neofetch-logo" },
            { text: (stat[0] || "").padEnd(10), cls: "term-neofetch-key" },
            { text: stat[1] || "", cls: "" },
          ]);
        }
      }
      // color palette blocks
      this.writeSpan([
        { text: "                  ", cls: "" },
        { text: "  ", cls: "term-pal-rosewater" },
        { text: "  ", cls: "term-pal-flamingo" },
        { text: "  ", cls: "term-pal-pink" },
        { text: "  ", cls: "term-pal-mauve" },
        { text: "  ", cls: "term-pal-red" },
        { text: "  ", cls: "term-pal-peach" },
        { text: "  ", cls: "term-pal-yellow" },
        { text: "  ", cls: "term-pal-green" },
        { text: "  ", cls: "term-pal-teal" },
        { text: "  ", cls: "term-pal-blue" },
        { text: "  ", cls: "term-pal-sapphire" },
        { text: "  ", cls: "term-pal-lavender" },
      ]);
      this.writeBlank();
      return "";
    },

    skills: function() {
      const bar = (pct) => {
        const filled = Math.round(pct / 5);
        return "█".repeat(filled) + "░".repeat(20 - filled) + "  " + pct + "%";
      };
      this.writeBlank();
      this.writeLine("  ╔══════════════════════════════════════╗", "term-dim");
      this.writeLine("  ║          SKILL MATRIX                ║", "term-accent");
      this.writeLine("  ╚══════════════════════════════════════╝", "term-dim");
      this.writeBlank();

      const sections = [
        { label: "LANGUAGES", items: [
          ["Rust",       85], ["Python",     88], ["Go",         72],
          ["JavaScript", 80], ["C/C++",      55], ["Bash",       78],
        ]},
        { label: "TOOLS & INFRA", items: [
          ["Linux",      98], ["Neovim",     99], ["Git",        92],
          ["Docker",     75], ["FastAPI",    82], ["PostgreSQL", 70],
        ]},
        { label: "CURRENTLY LEARNING", items: [
          ["Nix",        40], ["Zig",        30], ["Kernel Dev", 20],
        ]},
      ];

      for (const sec of sections) {
        this.writeLine("  " + sec.label, "term-header");
        for (const [name, pct] of sec.items) {
          this.writeSpan([
            { text: "    " + name.padEnd(14), cls: "term-accent" },
            { text: bar(pct), cls: "term-progress" },
          ]);
        }
        this.writeBlank();
      }
      return "";
    },

    projects: function() {
      this.writeBlank();
      this.writeLine("  ╔══════════════════════════════════════╗", "term-dim");
      this.writeLine("  ║            PROJECTS                  ║", "term-accent");
      this.writeLine("  ╚══════════════════════════════════════╝", "term-dim");
      this.writeBlank();

      const projects = [
        {
          num: "01", name: "yoru", desc: "private pastebin — minimal, self-hosted",
          stack: "Go · PostgreSQL · Docker · Traefik · AWS",
          status: "LIVE", statusCls: "term-ok",
          url: "https://github.com/ryu-ryuk/yoru",
        },
        {
          num: "02", name: "lenrs", desc: "TUI OCR tool with live preview",
          stack: "Rust · Tesseract · Ratatui",
          status: "WIP ", statusCls: "term-warn",
          url: "https://github.com/ryu-ryuk/lenrs",
        },
        {
          num: "03", name: "call_handler", desc: "real-time voice AI pipeline",
          stack: "Python · FastAPI · CUDA · Silero VAD · DeepFilterNet",
          status: "INTERNAL", statusCls: "term-dim",
          url: null,
        },
        {
          num: "04", name: "terminal.xyz", desc: "this portfolio — you're in it",
          stack: "Vite · GSAP · Tailwind · Anime.js",
          status: "LIVE", statusCls: "term-ok",
          url: "https://github.com/ryu-ryuk/terminal",
        },
      ];

      for (const p of projects) {
        this.writeSpan([
          { text: "  [" + p.num + "] ", cls: "term-dim" },
          { text: p.name, cls: "term-accent" },
          { text: " — " + p.desc, cls: "" },
        ]);
        this.writeLine("       Stack:  " + p.stack, "term-dim");
        const statusSpans = [{ text: "       Status: ", cls: "term-dim" }, { text: p.status, cls: p.statusCls }];
        if (p.url) {
          statusSpans.push({ text: "  →  ", cls: "term-dim" });
          statusSpans.push({ text: p.url.replace("https://", ""), cls: "term-link", href: p.url });
        }
        this.writeSpan(statusSpans);
        this.writeBlank();
      }
      return "";
    },

    contact: function() {
      this.writeBlank();
      this.writeLine("  ╔══════════════════════════════════════╗", "term-dim");
      this.writeLine("  ║           CONTACT RYU                ║", "term-accent");
      this.writeLine("  ╚══════════════════════════════════════╝", "term-dim");
      this.writeBlank();
      const links = [
        { icon: "✉ ", label: "Email   ", url: "mailto:contact@alokranjan.me", display: "contact@alokranjan.me" },
        { icon: "⊕ ", label: "GitHub  ", url: "https://github.com/ryu-ryuk",     display: "github.com/ryu-ryuk" },
        { icon: "✍ ", label: "Blog    ", url: "https://blogs.alokranjan.me",      display: "blogs.alokranjan.me" },
      ];
      for (const l of links) {
        this.writeSpan([
          { text: "    " + l.icon + l.label + "→  ", cls: "term-dim" },
          { text: l.display, cls: "term-link", href: l.url },
        ]);
      }
      this.writeBlank();
      this.writeLine('  Type "open github" or "open blog" to navigate.', "term-dim");
      return "";
    },

    open: function(args) {
      const target = args.join(" ").toLowerCase();
      const map = {
        about:    "/about.html",
        projects: "/projects.html",
        contact:  "/contact.html",
        github:   "https://github.com/ryu-ryuk",
        blog:     "https://blogs.alokranjan.me",
      };
      if (!target) return "Usage: open [about|projects|contact|github|blog]";
      const dest = map[target];
      if (!dest) return `open: unknown target '${target}'`;
      this.writeLine(`Opening ${target}...`, "term-dim");
      setTimeout(() => {
        if (dest.startsWith("http")) window.open(dest, "_blank");
        else window.location.href = dest;
      }, 300);
      return "";
    },

    spotify: function() {
      const song   = document.getElementById("spotify-song")?.textContent;
      const artist = document.getElementById("spotify-artist")?.textContent;
      const status = document.getElementById("spotify-status")?.textContent;
      if (song && artist) {
        this.writeLine("  ♫  " + status, "term-dim");
        this.writeSpan([
          { text: "     ", cls: "" },
          { text: song, cls: "term-accent" },
          { text: "  —  " + artist, cls: "term-dim" },
        ]);
      } else {
        this.writeLine("  No Spotify data available.", "term-dim");
      }
      return "";
    },

    theme: function(args) {
      const name = args[0];
      if (!name) {
        this.writeLine("  Available themes:", "term-dim");
        for (const [k, v] of Object.entries(this.themes)) {
          const active = k === this.currentTheme ? "  ← active" : "";
          this.writeSpan([
            { text: "    " + k.padEnd(8), cls: "term-accent" },
            { text: v + active, cls: "term-dim" },
          ]);
        }
        this.writeLine("\n  Usage: theme [green|amber|cyan|pink]", "term-dim");
        return "";
      }
      if (!this.themes[name]) return `theme: unknown theme '${name}'. Options: green amber cyan pink`;
      this.applyTheme(name);
      return "";
    },

    fortune: function() {
      const fortunes = [
        "You will rm -rf / accidentally... soon.",
        "The answer is always 42. The question? 'How to exit vim?'",
        "Alert! SELinux is preventing you from having fun.",
        "WARNING: 99.9% of sudoers have root access. You are not the 0.1%.",
        "Your code is perfect. The universe is the bug.",
        "Have you tried turning it off and on again? (Arch users: reinstall.)",
        "The best code is no code. You have written much code. Think about that.",
        "cat /dev/urandom | sudo tee /dev/brain — you're already running this.",
        "It is pitch black. You are likely to be eaten by a grue. Or a kernel panic.",
        "Error: too much coffee detected in /usr/bin/ryu. Brew more.",
      ];
      return "  " + fortunes[Math.floor(Math.random() * fortunes.length)];
    },

    sudo: function(args) {
      const cmd = args.join(" ");
      if (cmd === "give me coffee") {
        this.writeSpan([
          { text: "  ☕ Brewing", cls: "term-accent" },
          { text: "... ERROR: Coffee machine not found at /dev/espresso", cls: "term-error" },
        ]);
        return "";
      }
      if (cmd === "rm -rf /") {
        this.writeLine("  [sudo] password for ryu:", "term-dim");
        this.writeLine("  Initiating self-destruct in 3...", "term-error");
        this.writeLine("  Initiating self-destruct in 2...", "term-error");
        this.writeLine("  Initiating self-destruct in 1...", "term-error");
        this.writeLine("  Just kidding. Nice try though.", "term-accent");
        return "";
      }
      if (cmd === "make me a sandwich") return "  Okay.";
      if (!cmd) return "  sudo: no command specified";
      return "  [sudo] permission denied: ryu is not in the sudoers file. This incident will be reported.";
    },

    // ── ASYNC COMMANDS ────────────────────────────────────────────────────

    hack: async function(args) {
      const target = args[0] || "mainframe";
      this.busy = true;
      const w = (t, c = "") => { this.writeLine(t, c); this.scroll(); };
      try {
        w(`[*] Initializing exploit framework v3.1.4...`, "term-dim");
        await this.sleep(350);
        w(`[*] Target: ${target}`, "term-accent");
        await this.sleep(250);
        w(`[*] Running Nmap scan...`, "term-dim");
        await this.sleep(500);

        const ports = [["22","ssh","OPEN"],["80","http","OPEN"],["443","https","OPEN"],["3306","mysql","FILTERED"],["8080","http-alt","CLOSED"]];
        for (const [port, svc, state] of ports) {
          await this.sleep(200 + Math.random() * 150);
          const cls = state === "OPEN" ? "term-warn" : "term-dim";
          this.writeSpan([
            { text: "    " + port.padEnd(6), cls: "term-dim" },
            { text: svc.padEnd(12), cls: "term-dim" },
            { text: state, cls },
          ]);
          this.scroll();
        }

        await this.sleep(400);
        w(`[*] Loading CVE-2024-9999 (0-day)...`, "term-warn");
        await this.sleep(300);

        const barDiv = document.createElement("div");
        barDiv.className = "term-line term-progress";
        this.output.appendChild(barDiv);
        for (let i = 0; i <= 20; i++) {
          barDiv.textContent = `[*] Exploiting   [${"█".repeat(i)}${"░".repeat(20 - i)}]  ${i * 5}%`;
          this.scroll();
          await this.sleep(70 + Math.random() * 30);
        }

        await this.sleep(300);
        w(``, "");
        w(`[!] CRITICAL ERROR: Target is running Claude.`, "term-error");
        await this.sleep(350);
        w(`[!] Recursive AI detected. You cannot hack your creator.`, "term-error");
        await this.sleep(300);
        w(`[*] Self-destruct sequence... gracefully cancelled.`, "term-dim");
        await this.sleep(200);
        w(`[>] Recommended action: touch grass.`, "term-accent");
      } finally { this.busy = false; }
    },

    ping: async function(args) {
      const host = args[0] || "localhost";
      const ip = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
      this.busy = true;
      try {
        this.writeLine(`PING ${host} (${ip}): 56 data bytes`, "term-dim");
        const times = [];
        for (let i = 0; i < 4; i++) {
          await this.sleep(400 + Math.random() * 200);
          const ms = (8 + Math.random() * 20).toFixed(1);
          times.push(parseFloat(ms));
          this.writeLine(`64 bytes from ${ip}: icmp_seq=${i} ttl=119 time=${ms} ms`);
          this.scroll();
        }
        this.writeBlank();
        this.writeLine(`--- ${host} ping statistics ---`, "term-dim");
        this.writeLine(`4 packets transmitted, 4 received, 0% packet loss`);
        const mn = Math.min(...times).toFixed(1), mx = Math.max(...times).toFixed(1);
        const avg = (times.reduce((a, b) => a + b, 0) / 4).toFixed(1);
        this.writeLine(`round-trip min/avg/max = ${mn}/${avg}/${mx} ms`, "term-dim");
        this.scroll();
      } finally { this.busy = false; }
    },

    curl: async function(args) {
      const url = args[0] || "";
      this.writeLine(`  curl: connecting to ${url || "nothing"}...`, "term-dim");
      await this.sleep(600);
      if (url.includes("spotify")) return '  {"song":"Circles","artist":"Post Malone","isPlaying":true}';
      if (url.includes("github"))  return '  {"login":"ryu-ryuk","repos":12,"followers":404,"bio":"i use arch btw"}';
      if (url.includes("google") || url.includes("youtube")) return "  403 Forbidden.";
      if (!url) return "  Usage: curl [url]";
      return `  200 OK\n  Nothing interesting here.`;
    },

    nmap: async function(args) {
      const target = args[0] || "localhost";
      this.busy = true;
      try {
        this.writeLine(`Starting Nmap 7.94 ( https://nmap.org )`, "term-dim");
        this.writeLine(`Nmap scan report for ${target}`, "term-dim");
        await this.sleep(800);
        this.writeLine(`Host is up (0.042s latency).`, "term-dim");
        this.writeBlank();
        this.writeLine("PORT      STATE   SERVICE", "term-header");
        const ports = [["22/tcp","open","ssh"],["80/tcp","open","http"],["443/tcp","open","https"],["8080/tcp","filtered","http-proxy"]];
        for (const [p, s, svc] of ports) {
          await this.sleep(150);
          this.writeSpan([
            { text: p.padEnd(12), cls: "term-dim" },
            { text: s.padEnd(10), cls: s === "open" ? "term-ok" : "term-warn" },
            { text: svc, cls: "term-dim" },
          ]);
        }
        this.writeBlank();
        this.writeLine(`Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds`, "term-dim");
      } finally { this.busy = false; }
    },

    htop: function() {
      this.writeBlank();
      this.writeLine("  PID    USER    CPU%   MEM%   COMMAND", "term-header");
      this.writeLine("  " + "─".repeat(52), "term-dim");
      const procs = [
        ["1",    "root",  "0.0", "0.1",  "systemd"],
        ["420",  "ryu",   "2.1", "1.2",  "neovim src/main.js"],
        ["666",  "ryu",   "0.3", "0.4",  "zsh"],
        ["1337", "ryu",   "99.9","69.4", "vim  [No write since last change]"],
        ["2048", "ryu",   "0.1", "0.2",  "curl $SPOTIFY_API/now-playing"],
      ];
      for (const [pid, user, cpu, mem, cmd] of procs) {
        const cpuCls = parseFloat(cpu) > 50 ? "term-error" : parseFloat(cpu) > 10 ? "term-warn" : "term-dim";
        this.writeSpan([
          { text: "  " + pid.padEnd(7) + user.padEnd(8), cls: "term-dim" },
          { text: cpu.padEnd(7), cls: cpuCls },
          { text: mem.padEnd(7), cls: "term-dim" },
          { text: cmd, cls: "" },
        ]);
      }
      this.writeBlank();
      this.writeLine("  Tasks: 7 total,  1 running,  6 sleeping  |  F10 to quit (just kidding)", "term-dim");
      return "";
    },

    git: function(args) {
      const sub = args[0];
      if (sub === "log" || sub === "log") {
        const commits = [
          ["a1b2c3d", "Refactor terminal — go absolutely unhinged"],
          ["e4f5g6h", "Add GSAP animations. No reason. Just vibes."],
          ["i7j8k9l", "Fix mobile menu (again). Last time. Probably."],
          ["m1n2o3p", "Add Spotify widget because why not"],
          ["q4r5s6t", "Initial commit: btw I use Arch"],
        ];
        for (const [hash, msg] of commits) {
          this.writeSpan([
            { text: "commit ", cls: "term-dim" },
            { text: hash, cls: "term-accent" },
          ]);
          this.writeLine("Author: ryu-ryuk <ryu@archy>", "term-dim");
          this.writeLine("Date:   " + new Date().toDateString(), "term-dim");
          this.writeBlank();
          this.writeLine("    " + msg);
          this.writeBlank();
        }
        return "";
      }
      if (sub === "status") {
        this.writeLine("On branch main", "term-dim");
        this.writeLine("Your branch is ahead of 'origin/main' by ∞ commits.", "term-accent");
        this.writeBlank();
        this.writeLine("Changes not staged for commit:", "term-warn");
        this.writeLine("  modified:   src/main.js", "term-error");
        this.writeLine("  modified:   src/style.css", "term-error");
        return "";
      }
      if (sub === "push") return "  error: you don't have write access to production (nice try)";
      if (!sub) return "  usage: git [log|status|push]";
      return `  git: '${sub}' is not a git command. See 'git --help'.`;
    },

    pacman: async function(args) {
      const flag = args[0];
      const pkg  = args[1] || args[0];
      if (flag !== "-S" && flag !== "-Syu") {
        return `  pacman: invalid option '${flag}'. Try pacman -S [package]`;
      }
      if (flag === "-Syu") {
        this.busy = true;
        try {
          this.writeLine(":: Synchronizing package databases...", "term-dim");
          await this.sleep(500);
          this.writeLine(" core is up to date", "term-ok");
          this.writeLine(" extra is up to date", "term-ok");
          await this.sleep(300);
          this.writeLine(":: Starting full system upgrade...", "term-dim");
          await this.sleep(400);
          this.writeLine(" there is nothing to do", "term-accent");
        } finally { this.busy = false; }
        return "";
      }
      this.busy = true;
      try {
        this.writeLine(`:: Resolving dependencies for ${pkg}...`, "term-dim");
        await this.sleep(400);
        this.writeLine(`:: Checking for package conflicts...`, "term-dim");
        await this.sleep(300);
        this.writeLine(`\nPackages (3) dependency-a  dependency-b  ${pkg}`, "term-dim");
        await this.sleep(200);
        this.writeBlank();
        this.writeLine(`Total Download Size:    4.20 MiB`, "term-dim");
        this.writeLine(`Total Installed Size:  13.37 MiB`, "term-dim");
        this.writeBlank();
        this.writeLine(":: Proceed with installation? [Y/n]", "term-warn");
        await this.sleep(400);
        this.writeLine("y", "term-dim");

        const barDiv2 = document.createElement("div");
        barDiv2.className = "term-line term-progress";
        this.output.appendChild(barDiv2);
        for (let i = 0; i <= 20; i++) {
          barDiv2.textContent = `downloading ${pkg}  [${"█".repeat(i)}${"░".repeat(20-i)}]  ${i*5}%`;
          this.scroll();
          await this.sleep(60);
        }
        this.writeBlank();
        this.writeLine(`(3/3) installing ${pkg}`, "term-ok");
        await this.sleep(200);
        this.writeLine(`:: Running post-install hooks...`, "term-dim");
        await this.sleep(200);
        this.writeLine(`:: Transaction successfully completed.`, "term-ok");
      } finally { this.busy = false; }
    },

    nvim: async function() {
      this.busy = true;
      try {
        this.writeLine("", "");
        this.writeLine("  ~", "term-dim");
        this.writeLine("  ~", "term-dim");
        this.writeLine("  ~", "term-dim");
        this.writeLine('  "main.js" 624L, 18429B', "term-dim");
        await this.sleep(1200);
        this.writeBlank();
        this.writeLine("  E37: No write since last change (add ! to override)", "term-error");
        await this.sleep(800);
        this.writeLine('  Type  :q!  to exit without saving.', "term-warn");
        this.writeLine("  Type  ZZ   to save and exit.", "term-dim");
        this.writeLine("  Or just close the terminal like a normal person.", "term-dim");
      } finally { this.busy = false; }
    },

    matrix: function() {
      this.writeSpan([
        { text: "  initiating...", cls: "term-dim" },
      ]);
      this.scroll();
      PageMatrix.trigger();
      return "";
    },

    banner: function(args) {
      // Each letter is defined as 5 rows, each row exactly 7 chars wide
      const W = 7;
      const glyphs = {
        A:["  ███  ","  █ █  ","  ███  ","  █ █  ","  █ █  "],
        B:["  ███  ","  █ █  ","  ███  ","  █ █  ","  ███  "],
        C:["  ████ ","  █    ","  █    ","  █    ","  ████ "],
        D:["  ███  ","  █ █  ","  █ █  ","  █ █  ","  ███  "],
        E:["  ████ ","  █    ","  ███  ","  █    ","  ████ "],
        F:["  ████ ","  █    ","  ███  ","  █    ","  █    "],
        G:["  ████ ","  █    ","  █ ██ ","  █  █ ","  ████ "],
        H:["  █ █  ","  █ █  ","  ███  ","  █ █  ","  █ █  "],
        I:["  ███  ","   █   ","   █   ","   █   ","  ███  "],
        J:["   ██  ","    █  ","    █  ","  █ █  ","   ██  "],
        K:["  █ █  ","  ██   ","  █    ","  ██   ","  █ █  "],
        L:["  █    ","  █    ","  █    ","  █    ","  ████ "],
        M:["  █ █  ","  ███  ","  █ █  ","  █ █  ","  █ █  "],
        N:["  █ █  ","  ██ █ ","  █ █  ","  █ ██ ","  █ █  "],
        O:["  ███  ","  █ █  ","  █ █  ","  █ █  ","  ███  "],
        P:["  ███  ","  █ █  ","  ███  ","  █    ","  █    "],
        Q:["  ███  ","  █ █  ","  █ █  ","  ████ ","     █ "],
        R:["  ███  ","  █ █  ","  ███  ","  ██   ","  █ █  "],
        S:["  ████ ","  █    ","  ███  ","     █ ","  ████ "],
        T:["  ███  ","   █   ","   █   ","   █   ","   █   "],
        U:["  █ █  ","  █ █  ","  █ █  ","  █ █  ","  ███  "],
        V:["  █ █  ","  █ █  ","  █ █  ","  ███  ","   █   "],
        W:["  █ █  ","  █ █  ","  ███  ","  ███  ","  █ █  "],
        X:["  █ █  ","  ███  ","   █   ","  ███  ","  █ █  "],
        Y:["  █ █  ","  ███  ","   █   ","   █   ","   █   "],
        Z:["  ███  ","    █  ","   █   ","  █    ","  ███  "],
        " ":["       ","       ","       ","       ","       "],
        ".":["       ","       ","       ","   █   ","   █   "],
        "!":["   █   ","   █   ","   █   ","       ","   █   "],
      };
      const text = (args.join(" ").toUpperCase().slice(0, 10) || "RYU");
      const letters = text.split("").map(c => glyphs[c] || glyphs[" "]);
      this.writeBlank();
      for (let r = 0; r < 5; r++) {
        const line = "  " + letters.map(l => l[r]).join("");
        this.writeLine(line, "term-banner");
      }
      this.writeBlank();
      return "";
    },

    exit:   function() { this.hide(); return ""; },
  };
}

function randomBetween(min, max) { return Math.random() * (max - min) + min; }

// ── Full-page canvas Matrix rain ───────────────────────────────────────────
const PageMatrix = {
  trigger(durationMs = 3800) {
    if (document.getElementById("page-matrix-canvas")) return; // already running

    const canvas = document.createElement("canvas");
    canvas.id = "page-matrix-canvas";
    canvas.style.cssText = [
      "position:fixed", "inset:0", "width:100%", "height:100%",
      "z-index:99999", "pointer-events:none",
      "opacity:0", "transition:opacity 0.35s ease",
    ].join(";");
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const CHARS = "アァカサタナハマヤャラワガザダバイキシチヒミギジジビクスツヌフムユュグズブコソトノホモヨョゴゾドボヴッン01";
    const fontSize = 14;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: cols }, () => Math.random() * -50);

    let raf;
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // head char: bright white
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fontSize}px 'Geist Mono', monospace`;
        ctx.fillText(char, x, y);
        // body: green
        ctx.fillStyle = "rgba(51,255,51,0.75)";
        ctx.font = `${fontSize}px 'Geist Mono', monospace`;
        const tail = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(tail, x, y + fontSize);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      }
      raf = requestAnimationFrame(draw);
    };

    // fade in
    requestAnimationFrame(() => { canvas.style.opacity = "0.92"; });
    draw();

    // schedule fade-out and cleanup
    setTimeout(() => {
      canvas.style.transition = "opacity 0.8s ease";
      canvas.style.opacity = "0";
      setTimeout(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        canvas.remove();
      }, 850);
    }, durationMs);
  },
};

const MatrixRainEffect = {
  createMatrixRain() {
    document.querySelectorAll('.project-context').forEach(container => {
      if (container.querySelector('.matrix-container')) return;
      const matrixContainer = document.createElement('div');
      matrixContainer.classList.add('matrix-container');
      container.appendChild(matrixContainer);
      for (let i = 0; i < 12; i++) {
        const column = document.createElement('div');
        column.classList.add('matrix-column');
        column.style.right = `${i * (100 / 12) + (Math.random() * 10 - 5)}%`;
        column.style.top = `${Math.random() * 100}%`;
        matrixContainer.appendChild(column);
        const charCount = 5 + Math.floor(Math.random() * 5);
        for (let j = 0; j < charCount; j++) {
          const char = document.createElement('div');
          char.classList.add('matrix-char');
          char.textContent = this.getRandomMatrixChar();
          column.appendChild(char);
        }
        this.animateMatrixColumn(column);
      }
    });
  },

  animateMatrixColumn(column) {
    const chars = column.querySelectorAll('.matrix-char');
    if (chars.length > 0) chars[0].classList.add('head');
    chars.forEach((char, i) => {
      setInterval(() => { if (Math.random() > 0.7) char.textContent = this.getRandomMatrixChar(); }, 1000 + Math.random() * 2000);
      char.style.opacity = i === 0 ? '1' : '0.6';
    });
    let position = 0;
    const speed = 0.3 + Math.random() * 1.2;
    const tick = () => {
      position += speed;
      column.style.transform = `translateY(${position}px)`;
      if (position > 300) {
        position = -100;
        chars.forEach(c => c.textContent = this.getRandomMatrixChar());
      }
      requestAnimationFrame(tick);
    };
    tick();
  },

  getRandomMatrixChar() {
    const chars = 'アァカサタナハマヤャラワ...0123456789';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  },

  addMatrixStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .matrix-container { position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;opacity:0.15;z-index:0;
        mask-image:linear-gradient(to left,rgba(0,0,0,0.9) 70%,rgba(0,0,0,0.4) 85%,transparent 100%);
        -webkit-mask-image:linear-gradient(to left,rgba(0,0,0,0.9) 70%,rgba(0,0,0,0.4) 85%,transparent 100%); }
      .project-card:hover .matrix-container { opacity:0.25; }
      .matrix-column { position:absolute;display:flex;flex-direction:column;gap:4px;color:#33ff33;font-family:monospace;font-size:12px;text-shadow:0 0 2px #33ff33; }
      .matrix-char { display:inline-block; }
      .matrix-char.head { color:#fff;text-shadow:0 0 5px #33ff33,0 0 10px #33ff33; }
    `;
    document.head.appendChild(style);
  }
};

function initFooterTicker() {
  const footerTicker = document.getElementById('footer-ticker');
  if (!footerTicker) return;
  const children = [...footerTicker.children];
  for (let i = 0; i < 2; i++) {
    children.forEach(child => footerTicker.appendChild(child.cloneNode(true)));
  }
  const tickerWidth = footerTicker.scrollWidth / 3;
  const anim = gsap.timeline({ repeat: -1, defaults: { ease: "none" } });
  anim.to(footerTicker, { x: -tickerWidth, duration: 15, onComplete: () => gsap.set(footerTicker, { x: 0 }) });
  const footer = document.querySelector('footer');
  footerTicker.querySelectorAll('a.ticker-item').forEach(link => {
    link.addEventListener('mouseenter', () => anim.pause());
    link.addEventListener('mouseleave', () => { if (!footer.matches(':hover')) anim.play(); });
  });
  footer.addEventListener('mouseenter', () => anim.pause());
  footer.addEventListener('mouseleave', () => anim.play());
  let t;
  window.addEventListener('scroll', () => { anim.timeScale(1.5); clearTimeout(t); t = setTimeout(() => anim.timeScale(1), 200); });
}

const ConfettiEffect = {
  createConfettiDot(x, y, colors) {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    document.body.appendChild(dot);
    gsap.set(dot, { backgroundColor: colors[Math.floor(Math.random() * colors.length)], top: y, left: x, scale: 0 });
    gsap.timeline({ onComplete: () => dot.remove() })
      .to(dot, { scale: randomBetween(0.6, 1.1), duration: 0.2, ease: "power3.out" })
      .to(dot, { duration: 1.6, physics2D: { velocity: randomBetween(400, 900), angle: randomBetween(0, 360), gravity: 1200 }, autoAlpha: 0, ease: "none" }, "<");
  },
  trigger(x, y) {
    const colors = ["#0ae448", "#abff84", "#fffce1"];
    for (let i = 0; i < Math.floor(randomBetween(16, 30)); i++) this.createConfettiDot(x, y, colors);
  }
};

const SpotifyWidget = {
  currentSong: null,

  setStatus(statusEl, text) {
    while (statusEl.firstChild) statusEl.removeChild(statusEl.firstChild);
    const span = document.createElement('span');
    span.className = 'glitch-span';
    span.dataset.text = text;
    span.textContent = text;
    statusEl.appendChild(span);
    const eq = document.createElement('div');
    eq.className = 'spotify-eq';
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'eq-bar';
      eq.appendChild(bar);
    }
    statusEl.appendChild(eq);
  },

  async fetchTrack() {
    const widget = document.getElementById("spotify-widget");
    if (!widget) return;
    const statusEl = document.getElementById("spotify-status");
    const songEl = document.getElementById("spotify-song");
    const artistEl = document.getElementById("spotify-artist");
    const albumArt = document.getElementById("album-art");
    const progressBar = document.querySelector(".progress-bar");

    try {
      const res = await fetch(`${API_BASE}/api/spotify`, { method: "GET", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      if (data.song) {
        this.setStatus(statusEl, data.isPlaying ? "NOW PLAYING" : "LAST PLAYED");
        songEl.textContent = data.song;
        artistEl.textContent = data.artist || "Unknown Artist";
        if (data.albumArt) {
          albumArt.src = data.albumArt;
          albumArt.classList.remove("hidden");
          gsap.to(".album-glow", { opacity: 0.3, duration: 0.5 });
        } else {
          albumArt.classList.add("hidden");
        }
        gsap.to(progressBar, { width: "0%", duration: 0.5 });
        if (this.currentSong !== data.song) {
          this.currentSong = data.song;
          gsap.fromTo(widget, { x: -20, y: 10 }, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)" });
          gsap.to(songEl, {
            skewX: "20deg", color: "#fff", textShadow: "0 0 15px #33ff33, 0 0 30px #33ff33",
            duration: 0.1, yoyo: true, repeat: 3,
            onComplete: () => gsap.to(songEl, { skewX: "0deg", color: "#33ff33", textShadow: "0 0 8px rgba(51,255,51,0.6)", duration: 0.2 }),
          });
          if (data.albumArt) {
            gsap.fromTo(albumArt, { scale: 0.6, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.6)", delay: 0.2 });
          }
          gsap.fromTo(".scanline-spotify", { y: 0, opacity: 0.9 }, { y: 60, opacity: 0.7, duration: 3, repeat: -1, ease: "none" });
        }
      } else {
        this.setStatus(statusEl, "OFFLINE");
        songEl.textContent = "No song playing";
        artistEl.textContent = data.error || "";
        albumArt.classList.add("hidden");
        gsap.to(widget, { opacity: 1, duration: 0.5 });
      }
    } catch (err) {
      console.error("Spotify API error:", err);
      this.setStatus(statusEl, "ERROR");
      songEl.textContent = "Connection lost";
      artistEl.textContent = "Can't fetch song";
      albumArt.classList.add("hidden");
      gsap.to(widget, { opacity: 1, duration: 0.5 });
      setTimeout(() => this.fetchTrack(), 5000);
    }
  },

  addRandomGlitches() {
    const widget = document.getElementById("spotify-widget");
    if (!widget || getComputedStyle(widget).opacity !== "1") return;
    if (Math.random() > 0.7) gsap.to(widget, { x: "+=2", duration: 0.1, yoyo: true, repeat: 1 });
    setTimeout(() => this.addRandomGlitches(), Math.random() * 5000 + 2000);
  },

  initializeWidget() {
    const widget = document.getElementById("spotify-widget");
    if (!widget) return;
    this.fetchTrack();
    setInterval(() => this.fetchTrack(), 60000);
    widget.addEventListener("mouseenter", () => gsap.to(".album-glow", { opacity: 0.5, duration: 0.3 }));
    widget.addEventListener("mouseleave", () => gsap.to(".album-glow", { opacity: 0.3, duration: 0.3 }));
    setTimeout(() => this.addRandomGlitches(), 3000);
  },
};

const ExperienceAnimations = {
  init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.to('.parallax-bg', {
      y: -100, ease: "none",
      scrollTrigger: { trigger: '.work-experience-section', start: "top bottom", end: "bottom top", scrub: 0.5 }
    });
    gsap.utils.toArray('.experience-reveal').forEach((el, i) => {
      gsap.fromTo(el, { y: 20, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out", delay: i * 0.2,
        scrollTrigger: { trigger: '.company-header', start: "top 80%", toggleActions: "play none none none" }
      });
    });
    gsap.fromTo('.experience-line', { scaleY: 0 }, {
      scaleY: 1, duration: 1.5, ease: "power2.inOut",
      scrollTrigger: { trigger: '.experience-cards-container', start: "top 70%", end: "bottom 20%", scrub: 0.5 }
    });
    gsap.utils.toArray('.experience-card').forEach((card, i) => {
      gsap.fromTo(card, { x: 30, opacity: 0 }, {
        x: 0, opacity: 1, duration: 0.8, ease: "back.out(1.2)", delay: i * 0.15,
        scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" }
      });
    });
    gsap.to('.card-dot', { scale: 1.2, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.2 });
    gsap.timeline({ scrollTrigger: { trigger: '.project-highlight', start: "top 75%", toggleActions: "play none none none" } })
      .fromTo('.project-highlight', { x: 30, opacity: 0, borderLeftWidth: 0 }, { x: 0, opacity: 1, borderLeftWidth: 2, duration: 1, ease: "power3.out" })
      .to('.project-highlight', { boxShadow: "0 0 15px rgba(51,255,51,0.2)", duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut" }, "-=0.5");
  }
};

const CursorTrail = {
  points: [],
  maxPoints: 20,
  prevX: 0,
  prevY: 0,

  init() {
    if ('ontouchstart' in window) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'cursor-trail';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let moveCount = 0;
    document.addEventListener('mousemove', (e) => {
      if (++moveCount % 2 !== 0) return;
      const dx = e.clientX - this.prevX;
      const dy = e.clientY - this.prevY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      if (speed > 3) {
        this.points.push({ x: e.clientX, y: e.clientY, life: 1, angle: Math.atan2(dy, dx), speed: Math.min(speed, 40) });
        if (this.points.length > this.maxPoints) this.points.shift();
      }
      this.prevX = e.clientX;
      this.prevY = e.clientY;
    });

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = this.points.length - 1; i >= 0; i--) {
        const p = this.points[i];
        p.life -= 0.03;
        if (p.life <= 0) { this.points.splice(i, 1); continue; }
        const alpha = p.life * 0.5;
        const size = 3 + (p.speed * 0.15) * p.life;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(size * 1.5, 0); ctx.lineTo(0, size * 0.5); ctx.lineTo(-size * 0.8, 0); ctx.lineTo(0, -size * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(51,255,51,${alpha * 0.7})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 1.5, 0); ctx.lineTo(0, size * 0.5); ctx.lineTo(0, -size * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(150,255,150,${alpha * 0.4})`;
        ctx.fill();
        ctx.shadowColor = '#33FF33';
        ctx.shadowBlur = 8 * p.life;
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(51,255,51,${alpha * 0.3})`;
        ctx.fill();
        ctx.restore();
      }
      if (this.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
        ctx.strokeStyle = `rgba(51,255,51,0.08)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const terminal = new Terminal();
  terminal.init();

  document.getElementById("terminal-tab")?.addEventListener("click", (e) => {
    terminal.show();
    const rect = e.currentTarget.getBoundingClientRect();
    ConfettiEffect.trigger(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  // expose for spotify command
  window.__terminal = terminal;

  document.querySelectorAll('.skill-panel').forEach(panel => {
    gsap.set(panel.querySelector('.panel-front'), { rotationY: 0 });
    gsap.set(panel.querySelector('.panel-back'), { rotationY: 180 });
    let isFlipped = false;
    panel.addEventListener('mouseenter', () => {
      if (!isFlipped) { gsap.to(panel, { rotationY: 180, duration: 0.7, ease: 'power3.inOut' }); isFlipped = true; }
    });
    panel.addEventListener('mouseleave', () => {
      if (isFlipped) { gsap.to(panel, { rotationY: 0, duration: 0.7, ease: 'power3.inOut' }); isFlipped = false; }
    });
  });

  const konamiCode = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let konamiPosition = 0;
  document.addEventListener("keydown", (e) => {
    konamiPosition = e.key === konamiCode[konamiPosition] ? konamiPosition + 1 : (e.key === konamiCode[0] ? 1 : 0);
    if (konamiPosition === konamiCode.length) {
      konamiPosition = 0;
      terminal.show();
      terminal.writeOutput("WOAH (*^^*) KONAMI CODE ACTIVATED!!!", "text-green-400 font-bold");
      terminal.window.classList.add("ring-4", "ring-green-400");
      setTimeout(() => terminal.window.classList.remove("ring-4", "ring-green-400"), 2000);
    }
  });

  const menuToggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("menu");
  menuToggle?.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    menu?.classList.toggle("open");
    document.body.classList.toggle("menu-open");
  });

  animate(svg.createDrawable(".headline-path"), {
    draw: ["0 0", "0 1", "1 1"],
    ease: "inOutQuad",
    duration: 2000,
    delay: stagger(100),
    loop: true,
  });

  initFooterTicker();
  SpotifyWidget.initializeWidget();
  setTimeout(() => MatrixRainEffect.createMatrixRain(), 1000);
  ExperienceAnimations.init();
  MatrixRainEffect.addMatrixStyles();
  initTimeline();
  CursorTrail.init();
});
