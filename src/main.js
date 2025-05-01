import "./style.css";
import { animate, svg, stagger, utils } from 'animejs';
const API_BASE = import.meta.env.VITE_API_URL;
// Terminal state
class Terminal {
  constructor() {
    this.overlay = null;
    this.window = null;
    this.input = null;
    this.output = null;
    this.form = null;
    this.isMinimized = false;
    this.isMaximized = false;
    this.fileSystem = {
      home: {
        "about.txt":
          "Linux enthusiast | Rust developer | Cybersecurity learner",
        projects: {
          "lenrs.md": "TUI OCR tool in Rust",
          "reverse-engineering.md": "GeeksForGeeks articles",
        },
        "secret-easter-egg.txt": 'HINT: Try "sudo give me coffee"',
      },
    };
    this.currentPath = "home";
    this.history = [];
    this.historyIndex = -1;
    this.tabCandidates = [];
    this.tabIndex = 0;
    this.lastInputBeforeTab = "";
  }

  init() {
    this.overlay = document.getElementById("terminal-overlay");
    this.window = document.getElementById("terminal-window");
    this.input = document.getElementById("terminal-input");
    this.output = document.getElementById("terminal-output");
    this.form = document.getElementById("terminal-form");

    if (
      !this.overlay ||
      !this.window ||
      !this.input ||
      !this.output ||
      !this.form
    ) {
      console.error("Terminal elements not found");
      return false;
    }

    this.bindEvents();
    return true;
  }

  bindEvents() {
    // document
      // .getElementById("open-terminal")
      // ?.addEventListener("click", () => this.show());
    document
      .getElementById("close-terminal")
      ?.addEventListener("click", () => this.hide());
    document
      .getElementById("minimize-terminal")
      ?.addEventListener("click", () => this.minimize());
    document
      .getElementById("maximize-terminal")
      ?.addEventListener("click", () => this.maximize());
    this.overlay?.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.window?.addEventListener("click", () => this.input.focus());
    this.form?.addEventListener("submit", (e) => this.handleCommand(e));

    // --- ENHANCEMENT: History and Tab Completion ---
    this.input.addEventListener("keydown", (e) => {
      // Command history navigation
      if (e.key === "ArrowUp") {
        if (this.history.length && this.historyIndex > 0) {
          this.historyIndex--;
          this.input.value = this.history[this.historyIndex];
        } else if (this.history.length && this.historyIndex === -1) {
          this.historyIndex = this.history.length - 1;
          this.input.value = this.history[this.historyIndex];
        }
        e.preventDefault();
        this.resetTabCompletion();
      } else if (e.key === "ArrowDown") {
        if (this.history.length && this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = -1;
          this.input.value = "";
        }
        e.preventDefault();
        this.resetTabCompletion();
      }
      // Tab completion
      else if (e.key === "Tab") {
        e.preventDefault();
        this.handleTabCompletion();
      } else {
        // Reset tab completion state on any other key
        this.resetTabCompletion();
      }
    });
  }

  // --- Tab Completion Logic ---
  handleTabCompletion() {
    const val = this.input.value.trim();
    if (this.tabCandidates.length === 0) {
      // First tab press: build candidates
      const [cmd, ...args] = val.split(" ");
      if (args.length === 0) {
        // Complete command names
        this.tabCandidates = Object.keys(this.commands).filter((c) =>
          c.startsWith(cmd)
        );
      } else {
        // Complete file/dir names for ls/cd/cat
        let dir = this.fileSystem[this.currentPath];
        if (!dir) dir = this.fileSystem["home"];
        const last = args[args.length - 1];
        if (last) {
          this.tabCandidates = Object.keys(dir).filter((f) =>
            f.startsWith(last)
          );
        }
      }
      this.lastInputBeforeTab = val;
      this.tabIndex = 0;
    }

    if (this.tabCandidates.length === 1) {
      // Only one match, autocomplete
      const [cmd, ...args] = val.split(" ");
      if (args.length === 0) {
        this.input.value = this.tabCandidates[0] + " ";
      } else {
        const before = val.slice(0, val.lastIndexOf(" ") + 1);
        this.input.value = before + this.tabCandidates[0];
      }
    } else if (this.tabCandidates.length > 1) {
      // Cycle through candidates
      const [cmd, ...args] = val.split(" ");
      let completed = "";
      if (args.length === 0) {
        completed = this.tabCandidates[this.tabIndex] + " ";
      } else {
        const before = val.slice(0, val.lastIndexOf(" ") + 1);
        completed = before + this.tabCandidates[this.tabIndex];
      }
      this.input.value = completed;
      this.tabIndex = (this.tabIndex + 1) % this.tabCandidates.length;
    }
  }

  resetTabCompletion() {
    this.tabCandidates = [];
    this.tabIndex = 0;
    this.lastInputBeforeTab = "";
  }

  show() {
    this.overlay.classList.remove("hidden");
    this.input.focus();
  }

  hide() {
    this.overlay.classList.add("hidden");
  }

  minimize() {
    this.output.classList.toggle("hidden");
    this.isMinimized = !this.isMinimized;
  }

  maximize() {
    this.window.classList.toggle("max-w-full");
    this.window.classList.toggle("h-[90vh]");
    this.isMaximized = !this.isMaximized;
  }

  handleCommand(event) {
    event.preventDefault();
    const inputValue = this.input.value.trim();
    if (!inputValue) return;

    // --- ENHANCEMENT: Save to history ---
    this.history.push(inputValue);
    this.historyIndex = -1; // Reset index after each command

    const [cmd, ...args] = inputValue.split(" ");
    this.writeOutput(`$ ${inputValue}`, "text-terminalGreen");

    if (this.commands[cmd]) {
      const result = this.commands[cmd].call(this, args);
      if (result) this.writeOutput(result);
    } else {
      this.writeOutput(`Command not found: ${cmd}`, "text-red-400");
    }

    this.input.value = "";
    this.output.scrollTop = this.output.scrollHeight;
    this.resetTabCompletion();
  }

  writeOutput(text, className = "") {
    this.output.innerHTML += `<div class="${className}">${text}</div>`;
  }

  commands = {
    help: () =>
      "Available commands: " + Object.keys(this.commands).join(", "),
    clear: () => {
      this.output.innerHTML =
        '<div>Type <span class="text-terminalGreen font-bold">help</span> for available commands</div>';
      return "";
    },
    ls: (args) => {
      const path = args[0] || this.currentPath;
      const dir = path
        .split("/")
        .reduce((acc, part) => acc?.[part], this.fileSystem);
      return dir ? Object.keys(dir).join(" ") : "Directory not found";
    },
    cd: (args) => {
      const path = args[0];
      if (path === "~") {
        this.currentPath = "home";
        return "Changed to home directory";
      }
      const newPath = path
        .split("/")
        .reduce((acc, part) => acc?.[part], this.fileSystem);
      if (newPath) {
        this.currentPath = path;
        return `Changed to ${path}`;
      }
      return "Invalid directory";
    },
    cat: (args) => {
      const path = args[0];
      if (!path) return "Please specify a file";
      const file = path
        .split("/")
        .reduce((acc, part) => acc?.[part], this.fileSystem);
      return typeof file === "string" ? file : "Not a file";
    },
    neofetch: () => `
      ryu@archy
      ------------------------
      OS: Arch Linux (btw)
      Shell: Zsh
      WM: Hyprland
      Editor: Neovim 🦀
      Hobbies: Linux ricing, scripting
      Uptime: null
    `,
    fortune: () => {
      const fortunes = [
        "You will rm -rf / accidentally... soon.",
        "The answer is always 42. The question? 'How to exit vim?'",
        "Alert! SELinux is preventing you from having fun.",
        "WARNING: 99.9% of sudoers have root access.",
      ];
      return fortunes[Math.floor(Math.random() * fortunes.length)];
    },
    sudo: (args) => {
      const cmd = args.join(" ");
      if (cmd === "give me coffee") return `ERROR: Out of coffee! ☕`;
      if (cmd === "rm -rf /") return "NICE TRY! System protected";
      return "Permission denied";
    },
    // === pwd command ---
    pwd: () => `/home/${this.currentPath}`,
  };
}


document.addEventListener("DOMContentLoaded", () => {
  const terminal = new Terminal();
  if (!terminal.init()) console.error("Failed to initialize terminal");

  // Animated Tab
  const terminalTab = document.getElementById("terminal-tab");
  terminalTab?.addEventListener("click", () => terminal.show());

  // Neon Toggle
  const terminalToggle = document.getElementById("terminal-toggle");
  terminalToggle?.addEventListener("click", () => {
    terminalToggle.classList.toggle("toggle-active");
    if (terminal.overlay.classList.contains("hidden")) {
      terminal.show();
    } else {
      terminal.hide();
    }
  });

  // Contextual Hover
  const cornerTrigger = document.getElementById("terminal-corner-trigger");
  const cornerButton = document.getElementById("terminal-corner-button");
  cornerTrigger?.addEventListener("mouseenter", () => {
    cornerButton.classList.add("opacity-100", "scale-100");
  });
  cornerTrigger?.addEventListener("mouseleave", () => {
    if (!cornerButton.matches(":hover")) {
      cornerButton.classList.remove("opacity-100", "scale-100");
    }
  });
  cornerButton?.addEventListener("mouseleave", () => {
    if (!cornerTrigger.matches(":hover")) {
      cornerButton.classList.remove("opacity-100", "scale-100");
    }
  });
  cornerButton?.addEventListener("click", () => terminal.show());

  // Keyboard Shortcut
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.key === "`") || (e.ctrlKey && e.altKey && e.key.toLowerCase() === "t")) {
      e.preventDefault();
      if (terminal.overlay.classList.contains("hidden")) {
        terminal.show();
      } else {
        terminal.hide();
      }
    }
  });
  // Konami Code
  const konamiCode = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'
  ];
  let konamiPosition = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiPosition]) {
      konamiPosition++;
      if (konamiPosition === konamiCode.length) {
        konamiPosition = 0;
        terminal.show();
        terminal.writeOutput('WOAH (*^^*) KONAMI CODE ACTIVATED!!!', 'text-green-400 font-bold');
        terminal.window.classList.add("ring-4", "ring-green-400");
        setTimeout(() => terminal.window.classList.remove("ring-4", "ring-green-400"), 2000);
      }
    } else {
      konamiPosition = (e.key === konamiCode[0]) ? 1 : 0;
    }
  });
  const menuToggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("menu");
  menuToggle?.addEventListener("click", () => {
    menu?.classList.toggle("hidden");
    menu?.classList.toggle("flex");
  });
  animate(svg.createDrawable('.headline-path'), {
    draw: ['0 0', '0 1', '1 1'],
    ease: 'inOutQuad',
    duration: 2000,
    delay: stagger(100),
    loop: true
  });


  let currentSong = null;

  async function fetchSpotifyTrack() {
    const widget = document.getElementById("spotify-widget");
    if (!widget) return;

    try {
      // Update the fetch request to handle credentials properly
      const res = await fetch(`${API_BASE}/api/spotify`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json();
      console.log("Spotify response:", data);
      if (data.song) {
        const albumArt = document.getElementById("album-art");
        const statusEl = document.getElementById("spotify-status");
        const songEl = document.getElementById("spotify-song");
        const artistEl = document.getElementById("spotify-artist");

        statusEl.textContent = data.isPlaying
          ? "🎵 Now Playing"
          : "🎧 Last Played";
        songEl.textContent = data.song;
        artistEl.textContent = data.artist;

        if (data.albumArt) {
          albumArt.src = data.albumArt;
          albumArt.classList.remove("hidden");
        }

        // If the song has changed, animate the widget
        if (currentSong !== data.song) {
          currentSong = data.song;
          widget.style.opacity = "1";

          if (typeof anime !== "undefined") {
            anime({
              targets: "#spotify-widget",
              translateX: [-20, 0],
              opacity: [0, 1],
              duration: 800,
              easing: "spring(1, 90, 10, 0)",
            });

            if (data.albumArt) {
              anime({
                targets: "#album-art",
                scale: [0.6, 1],
                opacity: [0, 1],
                rotateZ: [-10, 0],
                duration: 600,
                delay: 200,
                easing: "easeOutElastic(1, .6)",
              });
            }
          }
        }
      } else {
        widget.innerHTML = `
          <div class="text-gray-300">
            No song currently playing
            ${
              data.error
                ? `<span class="block text-xs text-gray-400 mt-1">${data.error}</span>`
                : ""
            }
          </div>
        `;
        widget.style.opacity = "1";
      }
    } catch (err) {
      console.error("Spotify error:", err);
      // Show a more descriptive error
      widget.innerHTML = `
        <div class="text-gray-300">
          Failed to fetch song info...
          <span class="block text-xs text-gray-400 mt-1">Make sure the Spotify API is running</span>
        </div>
      `;
      widget.style.opacity = "1";
    }
  }
animate(svg.createDrawable('.headline-path'), {
  draw: ['0 0', '0 1', '1 1'],
  ease: 'inOutQuad',
  duration: 2000,
  delay: stagger(100),
  loop: true
});


  // Initial fetch on page load
  fetchSpotifyTrack();

  // Fetch every 30 seconds to update the song info
  setInterval(fetchSpotifyTrack, 30000);
});

