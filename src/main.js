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
    this.isMaximized = false;
    this.fs = {
      "about.txt": "Linux enthusiast | Rust developer | Cybersecurity learner",
      projects: {
        "lenrs.md": "TUI OCR tool in Rust",
        "reverse-engineering.md": "GeeksForGeeks articles",
      },
      "secret-easter-egg.txt": 'HINT: Try "sudo give me coffee"',
    };
    this.cwd = [];
    this.history = [];
    this.historyIndex = -1;
    this.savedInput = "";
    this.tabCandidates = [];
    this.tabIndex = 0;
  }

  init() {
    this.overlay = document.getElementById("terminal-overlay");
    this.window = document.getElementById("terminal-window");
    this.input = document.getElementById("terminal-input");
    this.output = document.getElementById("terminal-output");
    this.form = document.getElementById("terminal-form");
    if (!this.overlay || !this.window || !this.input || !this.output || !this.form) return false;
    this.bindEvents();
    return true;
  }

  bindEvents() {
    document.getElementById("close-terminal")?.addEventListener("click", () => this.hide());
    document.getElementById("minimize-terminal")?.addEventListener("click", () => this.hide());
    document.getElementById("maximize-terminal")?.addEventListener("click", () => this.toggleMaximize());
    this.overlay?.addEventListener("click", (e) => { if (e.target === this.overlay) this.hide(); });
    this.window?.addEventListener("click", () => this.input.focus());
    this.form?.addEventListener("submit", (e) => this.handleCommand(e));
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!this.history.length) return;
        if (this.historyIndex === -1) { this.savedInput = this.input.value; this.historyIndex = this.history.length - 1; }
        else if (this.historyIndex > 0) this.historyIndex--;
        this.input.value = this.history[this.historyIndex];
        this.resetTab();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.historyIndex === -1) return;
        if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.input.value = this.history[this.historyIndex]; }
        else { this.historyIndex = -1; this.input.value = this.savedInput; }
        this.resetTab();
      } else if (e.key === "Tab") {
        e.preventDefault();
        this.handleTab();
      } else {
        this.resetTab();
      }
    });
  }

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

  handleTab() {
    const val = this.input.value;
    if (!this.tabCandidates.length) {
      const parts = val.split(" ");
      if (parts.length <= 1) {
        this.tabCandidates = Object.keys(this.commands).filter(c => c.startsWith(parts[0] || ""));
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
  show() {
    this.overlay.classList.remove("hidden");
    requestAnimationFrame(() => {
      this.overlay.classList.add("terminal-visible");
      this.window.classList.add("terminal-window-visible");
      this.input.focus();
    });
  }
  hide() {
    this.overlay.classList.remove("terminal-visible");
    this.window.classList.remove("terminal-window-visible");
    setTimeout(() => this.overlay.classList.add("hidden"), 300);
  }
  toggleMaximize() {
    this.window.classList.toggle("max-w-full");
    this.window.classList.toggle("h-[90vh]");
    this.isMaximized = !this.isMaximized;
  }

  handleCommand(event) {
    event.preventDefault();
    const inputValue = this.input.value.trim();
    if (!inputValue) return;
    this.history.push(inputValue);
    this.historyIndex = -1;
    this.savedInput = "";
    const [cmd, ...args] = inputValue.split(" ");
    this.writeOutput(`$ ${inputValue}`, "text-green-400");
    if (this.commands[cmd]) {
      const result = this.commands[cmd].call(this, args);
      if (result) this.writeOutput(result);
    } else {
      this.writeOutput(`command not found: ${cmd}`, "text-red-400");
    }
    this.input.value = "";
    this.output.scrollTop = this.output.scrollHeight;
    this.updatePrompt();
    this.resetTab();
  }

  updatePrompt() {
    const prompt = document.getElementById("terminal-prompt");
    if (prompt) prompt.textContent = (this.cwd.length ? "~/" + this.cwd.join("/") : "~") + "$";
  }

  writeOutput(text, className = "") {
    for (const line of text.split("\n")) {
      const div = document.createElement("div");
      if (className) div.className = className;
      div.textContent = line;
      this.output.appendChild(div);
    }
  }

  clearOutput() {
    while (this.output.firstChild) this.output.removeChild(this.output.firstChild);
    const div = document.createElement("div");
    div.textContent = "Type ";
    const span = document.createElement("span");
    span.className = "text-green-400 font-bold";
    span.textContent = "help";
    div.appendChild(span);
    div.appendChild(document.createTextNode(" for available commands"));
    this.output.appendChild(div);
  }

  commands = {
    help: () => "commands: " + Object.keys(this.commands).join(", "),
    clear: function() { this.clearOutput(); return ""; },
    ls: function(args) {
      const dir = this.resolveDir(args[0] ? this.resolvePath(args[0]) : this.cwd);
      if (!dir) return "ls: no such directory";
      return Object.keys(dir).map(k => typeof dir[k] === "object" ? k + "/" : k).join("  ");
    },
    cd: function(args) {
      const path = args[0];
      if (!path || path === "~") { this.cwd = []; return ""; }
      if (path === "..") { this.cwd.pop(); return ""; }
      const resolved = this.resolvePath(path);
      if (!this.resolveDir(resolved)) return "cd: no such directory: " + path;
      this.cwd = resolved;
      return "";
    },
    cat: function(args) {
      if (!args[0]) return "cat: missing file";
      let node = this.fs;
      for (const seg of this.resolvePath(args[0])) {
        if (typeof node !== "object" || !(seg in node)) return "cat: no such file: " + args[0];
        node = node[seg];
      }
      return typeof node === "string" ? node : "cat: is a directory";
    },
    pwd: () => "~" + (this.cwd.length ? "/" + this.cwd.join("/") : ""),
    whoami: () => "ryu",
    neofetch: () => [
      "  ryu@archy", "  ----------------",
      "  OS: Arch Linux (btw)", "  Shell: Zsh",
      "  WM: Hyprland", "  Editor: Neovim", "  Uptime: infinity",
    ].join("\n"),
    fortune: () => {
      const f = [
        "You will rm -rf / accidentally... soon.",
        "The answer is always 42. The question? 'How to exit vim?'",
        "Alert! SELinux is preventing you from having fun.",
        "WARNING: 99.9% of sudoers have root access.",
      ];
      return f[Math.floor(Math.random() * f.length)];
    },
    sudo: (args) => {
      const cmd = args.join(" ");
      if (cmd === "give me coffee") return "ERROR: Out of coffee!";
      if (cmd === "rm -rf /") return "NICE TRY! System protected";
      return "permission denied";
    },
  };
}

function randomBetween(min, max) { return Math.random() * (max - min) + min; }

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
