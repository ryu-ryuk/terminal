import "./style.css";
import { animate, svg, stagger, utils } from "animejs";
const API_BASE = import.meta.env.VITE_API_URL;

// =====================
// Terminal Class
// =====================
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
        "about.txt": "Linux enthusiast | Rust developer | Cybersecurity learner",
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
    help: () => "Available commands: " + Object.keys(this.commands).join(", "),
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
    pwd: () => `/home/${this.currentPath}`,
  };
}

// =====================
// Animation Utilities
// =====================
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// =====================
// Matrix Rain Effect
// =====================
const MatrixRainEffect = {
  createMatrixRain() {
    const containers = document.querySelectorAll('.project-context');
  
    containers.forEach(container => {
      // Create matrix container if it doesn't exist
      if (!container.querySelector('.matrix-container')) {
        const matrixContainer = document.createElement('div');
        matrixContainer.classList.add('matrix-container');
        container.appendChild(matrixContainer);
        
        // Increase the number of columns for wider spread
        const columnCount = 12; // Doubled from 6
        
        // Create columns
        for (let i = 0; i < columnCount; i++) {
          const column = document.createElement('div');
          column.classList.add('matrix-column');
          
          // Position columns across the entire width, not just right side
          // Distribute more evenly across the container
          const horizontalPosition = i * (100 / columnCount) + (Math.random() * 10 - 5);
          column.style.right = `${horizontalPosition}%`;
          column.style.top = `${Math.random() * 100}%`;
          
          matrixContainer.appendChild(column);
          
          // Add characters to column (fewer characters = better performance)
          const charCount = 5 + Math.floor(Math.random() * 5);
          for (let j = 0; j < charCount; j++) {
            const char = document.createElement('div');
            char.classList.add('matrix-char');
            char.textContent = this.getRandomMatrixChar();
            column.appendChild(char);
          }
          
          // Animate the column independently
          this.animateMatrixColumn(column);
        }
      }
    });
  },

  animateMatrixColumn(column) {
    const chars = column.querySelectorAll('.matrix-char');
    
    // Make first character the "head"
    if (chars.length > 0) {
      chars[0].classList.add('head');
    }
    
    // Animate characters with staggered fade-in
    chars.forEach((char, index) => {
      // Randomly change character occasionally
      setInterval(() => {
        if (Math.random() > 0.7) {
          char.textContent = this.getRandomMatrixChar();
        }
      }, 1000 + Math.random() * 2000);
      
      // Set initial opacity
      char.style.opacity = index === 0 ? '1' : '0.6';
    });
    
    // Use a simpler animation approach that doesn't rely on GSAP for better performance
    let position = 0;
    // Create more varied speeds for a more natural effect
    const speed = 0.3 + Math.random() * 1.2;
    
    const animateDown = () => {
      position += speed;
      column.style.transform = `translateY(${position}px)`;
      
      // Reset when it goes too far down
      if (position > 300) {
        position = -100;
        
        // Change characters on reset
        chars.forEach(char => {
          char.textContent = this.getRandomMatrixChar();
        });
      }
      
      requestAnimationFrame(animateDown);
    }
    
    animateDown();
  },

  getRandomMatrixChar() {
    const chars = 'アァカサタナハマヤャラワ...0123456789'; // Truncated for brevity
    return chars.charAt(Math.floor(Math.random() * chars.length));
  },

  addMatrixStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .matrix-container {
        position: absolute;
        top: 0;
        left: 0; /* Changed from right: 0 to cover the entire width */
        width: 100%; /* Changed from 40% to 100% */
        height: 100%;
        overflow: hidden;
        pointer-events: none;
        opacity: 0.15;
        /* Modified gradient to be more visible in the middle */
        mask-image: linear-gradient(to left, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.4) 85%, transparent 100%);
        -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.4) 85%, transparent 100%);
        z-index: 0;
      }
      
      .project-card:hover .matrix-container {
        opacity: 0.25;
      }
      
      .matrix-column {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: #33ff33;
        font-family: monospace;
        font-size: 12px;
        text-shadow: 0 0 2px #33ff33;
      }
      
      .matrix-char {
        display: inline-block;
      }
      
      .matrix-char.head {
        color: #ffffff;
        text-shadow: 0 0 5px #33ff33, 0 0 10px #33ff33;
      }
    `;
    document.head.appendChild(style);
  }
};

// =====================
// Footer Ticker
// =====================
function initFooterTicker() {
  const footerTicker = document.getElementById('footer-ticker');
  if (!footerTicker) return;
  
  // Clone content and setup
  const originalContent = footerTicker.innerHTML;
  footerTicker.innerHTML = originalContent + originalContent + originalContent;
  const tickerWidth = footerTicker.scrollWidth / 3;
  
  // Create animation timeline
  const tickerAnimation = gsap.timeline({
    repeat: -1,
    defaults: { ease: "none" }
  });
  
  tickerAnimation.to(footerTicker, {
    x: -tickerWidth,
    duration: 15,
    onComplete: () => gsap.set(footerTicker, { x: 0 })
  });
  
  // Event handlers
  const footer = document.querySelector('footer');
  const tickerLinks = footerTicker.querySelectorAll('a.ticker-item');
  
  const isHoveringOnLink = () => Array.from(tickerLinks).some(link => link.matches(':hover'));
  
  // Link hover handlers
  tickerLinks.forEach(link => {
    link.addEventListener('mouseenter', () => tickerAnimation.pause());
    link.addEventListener('mouseleave', () => {
      if (!footer.matches(':hover')) tickerAnimation.play();
    });
  });
  
  // Footer hover handlers
  footer.addEventListener('mouseenter', () => tickerAnimation.pause());
  footer.addEventListener('mouseleave', () => tickerAnimation.play());
  
  // Scroll speed adjustment
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (!footer.matches(':hover') && !isHoveringOnLink()) {
      tickerAnimation.timeScale(1.5);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => tickerAnimation.timeScale(1), 200);
    }
  });
}

// =====================
// Confetti Animation
// =====================
const ConfettiEffect = {
  createConfettiDot(x, y, colors) {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    document.body.appendChild(dot);

    gsap.set(dot, {
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      top: y,
      left: x,
      scale: 0,
    });

    gsap.timeline({
      onComplete: () => dot.remove(),
    })
    .to(dot, {
      scale: randomBetween(0.6, 1.1),
      duration: 0.2,
      ease: "power3.out",
    })
    .to(dot, {
      duration: 1.6,
      physics2D: {
        velocity: randomBetween(400, 900),
        angle: randomBetween(0, 360),
        gravity: 1200,
      },
      autoAlpha: 0,
      ease: "none",
    }, "<");
  },

  trigger(x, y) {
    const colors = ["#0ae448", "#abff84", "#fffce1"];
    const count = Math.floor(randomBetween(16, 30));
    for (let i = 0; i < count; i++) {
      this.createConfettiDot(x, y, colors);
    }
  }
};

// =====================
// Spotify Widget
// =====================
const SpotifyWidget = {
  currentSong: null,
  progressInterval: null,
  songDuration: 0,
  songProgress: 0,

  async fetchTrack() {
    const widget = document.getElementById("spotify-widget");
    if (!widget) return;

    try {
      const res = await fetch(`${API_BASE}/api/spotify`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      
      if (!res.ok) {
        console.error('Failed to fetch Spotify data:', res.status);
        this.showError(widget);
        return;
      }
      
      const data = await res.json();
      
      if (data.song) {
        const albumArt = document.getElementById("album-art");
        const statusEl = document.getElementById("spotify-status");
        const songEl = document.getElementById("spotify-song");
        const artistEl = document.getElementById("spotify-artist");
        const progressBar = document.querySelector(".progress-bar");
        
        if (!statusEl || !songEl || !artistEl || !progressBar) {
          console.error('Missing Spotify widget elements');
          this.showError(widget);
          return;
        }
        
        // Set text content with glitch effect
        const statusText = data.isPlaying ? "NOW PLAYING" : "LAST PLAYED";
        statusEl.innerHTML = `<span class="glitch-span" data-text="${statusText}">${statusText}</span>`;
        songEl.textContent = data.song;
        artistEl.textContent = data.artist;
        
        // Force immediate visibility
        widget.style.opacity = "1";
        
        // Update progress bar if available
        if (data.progress !== undefined && data.duration !== undefined) {
          this.songProgress = data.progress;
          this.songDuration = data.duration;
          
          // Clear any existing interval
          if (this.progressInterval) clearInterval(this.progressInterval);
          
          // Update progress bar initially
          const progressPercent = (this.songProgress / this.songDuration) * 100;
          gsap.to(progressBar, {
            width: `${progressPercent}%`,
            duration: 0.5
          });
          
          // Only set up interval if song is playing
          if (data.isPlaying) {
            // Update progress bar in real-time
            this.progressInterval = setInterval(() => {
              this.songProgress += 1000; // Add 1 second
              if (this.songProgress >= this.songDuration) {
                clearInterval(this.progressInterval);
                // Refresh data when song should be finished
                setTimeout(() => this.fetchTrack(), 2000);
              } else {
                const newProgressPercent = (this.songProgress / this.songDuration) * 100;
                gsap.to(progressBar, {
                  width: `${newProgressPercent}%`,
                  duration: 1,
                  ease: "none"
                });
              }
            }, 1000);
          }
        }
        
        // Handle album art with enhanced effects
        if (data.albumArt) {
          albumArt.src = data.albumArt;
          albumArt.classList.remove("hidden");
          
          // Extract dominant color from album art for glow effect (simplified version)
          const albumGlow = document.querySelector('.album-glow');
          if (albumGlow) {
            gsap.to(albumGlow, {
              background: 'rgba(51, 255, 51, 0.5)',
              opacity: 0.3,
              duration: 0.5
            });
          }
        } else {
          albumArt.classList.add("hidden");
        }
        
        // Animate on new song with enhanced cyberpunk effects
        if (this.currentSong !== data.song) {
          this.currentSong = data.song;
          
          // Show widget with animation
          gsap.to(widget, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
          });
          
          // Add entrance animation
          gsap.fromTo(widget, 
            { x: -20, y: 10, opacity: 0 },
            { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }
          );
          
          // Glitch effect on song change
          gsap.to(songEl, {
            skewX: "20deg",
            color: "#ffffff",
            textShadow: "0 0 15px #33ff33, 0 0 30px #33ff33",
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              gsap.to(songEl, {
                skewX: "0deg",
                color: "#33ff33",
                textShadow: "0 0 8px rgba(51, 255, 51, 0.6)",
                duration: 0.2
              });
            }
          });
          
          // Album art animation
          if (data.albumArt) {
            gsap.fromTo(albumArt,
              { scale: 0.6, opacity: 0, rotation: -10, filter: 'hue-rotate(90deg) brightness(1.5)' },
              { 
                scale: 1, 
                opacity: 1, 
                rotation: 0, 
                filter: 'hue-rotate(0deg) brightness(1)',
                duration: 0.8, 
                ease: "elastic.out(1, 0.6)",
                delay: 0.2
              }
            );
          }
          
          // Scanline animation reset
          const scanline = document.querySelector('.scanline-spotify');
          if (scanline) {
            gsap.fromTo(scanline,
              { y: 0, opacity: 0.9 },
              { y: 60, opacity: 0.7, duration: 3, repeat: -1, ease: "none" }
            );
          }
        }
      } else {
        // No song playing state with cyberpunk styling
        widget.innerHTML = `
          <div class="spotify-inner">
            <div class="scanline-spotify"></div>
            <div class="p-4 text-center relative z-10">
              <div class="text-xs glitch-text mb-2">
                <span class="glitch-span" data-text="OFFLINE">OFFLINE</span>
              </div>
              <div class="text-gray-300">
                No song currently playing
                ${data.error ? `<span class="block text-xs text-gray-400 mt-1">${data.error}</span>` : ""}
              </div>
            </div>
          </div>
        `;
        
        // Show with subtle animation
        gsap.to(widget, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out"
        });
      }
    } catch (err) {
      console.error('Error fetching Spotify data:', err);
      this.showError(widget);
    }
  },

  showError(widget) {
    if (!widget) return;
    widget.innerHTML = `
      <div class="spotify-inner">
        <div class="scanline-spotify"></div>
        <div class="p-4 text-center relative z-10">
          <div class="text-xs glitch-text mb-2">
            <span class="glitch-span" data-text="ERROR">ERROR</span>
          </div>
          <div class="text-gray-300">
            Connection lost
            <span class="block text-xs text-gray-400 mt-1">Can't fetch the song</span>
          </div>
        </div>
      </div>
    `;
    widget.style.opacity = "1";
  },

  addRandomGlitches() {
    const widget = document.getElementById("spotify-widget");
    if (!widget || widget.style.opacity !== "1") return;
    
    if (Math.random() > 0.7) {
      // Random glitch effect
      gsap.to(widget, {
        x: "+=2",
        duration: 0.1,
        yoyo: true,
        repeat: 1
      });
      
      // Glitch the album art occasionally
      const albumArt = document.getElementById("album-art");
      if (albumArt && !albumArt.classList.contains("hidden")) {
        gsap.to(albumArt, {
          filter: 'hue-rotate(90deg) brightness(1.5)',
          duration: 0.1,
          yoyo: true,
          repeat: 1
        });
      }
    }
    
    // Schedule next glitch
    setTimeout(() => this.addRandomGlitches(), Math.random() * 5000 + 2000);
  },

  initializeWidget() {
    const widget = document.getElementById("spotify-widget");
    if (!widget) return;

    // Initialize widget
    this.fetchTrack();
    setInterval(() => this.fetchTrack(), 30000);
    setTimeout(() => this.addRandomGlitches(), 3000);

    // Add hover interactions
    widget.addEventListener('mouseenter', () => {
      const albumGlow = widget.querySelector('.album-glow');
      if (albumGlow) {
        gsap.to(albumGlow, {
          opacity: 0.5,
          duration: 0.3
        });
      }
      
      // Pause the progress bar animation on hover
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
    });
    
    widget.addEventListener('mouseleave', () => {
      const albumGlow = widget.querySelector('.album-glow');
      if (albumGlow) {
        gsap.to(albumGlow, {
          opacity: 0.3,
          duration: 0.3
        });
      }
      
      // Resume progress bar animation if song is playing
      if (this.currentSong && this.songDuration > 0 && this.songProgress < this.songDuration) {
        this.progressInterval = setInterval(() => {
          this.songProgress += 1000;
          if (this.songProgress >= this.songDuration) {
            clearInterval(this.progressInterval);
            setTimeout(() => this.fetchTrack(), 2000);
          } else {
            const newProgressPercent = (this.songProgress / this.songDuration) * 100;
            gsap.to(document.querySelector(".progress-bar"), {
              width: `${newProgressPercent}%`,
              duration: 1,
              ease: "none"
            });
          }
        }, 1000);
      }
    });
  }
};

// =====================
// Journey Timeline
// =====================
const JourneyTimeline = {
  init() {
// Check if required libraries are loaded
    if (typeof gsap === 'undefined' || typeof Draggable === 'undefined' || typeof MotionPathPlugin === 'undefined') {
      console.error("Required plugins (GSAP, Draggable, MotionPathPlugin) not loaded");
      return;
    }

    console.log("GSAP version:", gsap.version);
    console.log("Draggable loaded:", typeof Draggable !== 'undefined');
    console.log("MotionPathPlugin loaded:", typeof MotionPathPlugin !== 'undefined');

    gsap.registerPlugin(MotionPathPlugin);

    const container = document.querySelector('.journey-container');
    const dragElement = document.getElementById("journey-drag");
    const journeyPath = document.getElementById("journey-path");
    const milestones = document.querySelectorAll(".milestone");
    const milestoneInfos = document.querySelectorAll(".milestone-info");

    console.log("dragElement found:", !!dragElement);
    console.log("journeyPath found:", !!journeyPath);
    console.log("container found:", !!container);

    if (!dragElement || !journeyPath || !container) {
      console.error("Journey timeline elements not found");
      return;
    }

    // Get the SVG element for coordinate calculations
    const svg = journeyPath.closest('svg');
    console.log("SVG found:", !!svg);

    if (!svg) {
      console.error("SVG container not found");
      return;
    }

    // Add CSS classes for better cursor feedback
    dragElement.style.cursor = "grab";

    // Create the draggable instance
    Draggable.create(dragElement, {
      type: "x,y",
      edgeResistance: 0.65,
      bounds: svg, // Use the SVG as bounds instead of container
      throwProps: true,
      inertia: true,
      onPress: function() {
        dragElement.style.cursor = "grabbing";
        this.update();
      },
      onRelease: function() {
        dragElement.style.cursor = "grab";
      },
      onDrag: function() {
        // Get the current position in SVG coordinates
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = this.x + 15; // Add circle radius to get center
        svgPoint.y = this.y + 15;
        
        // Find the closest point on the path
        const pathPoint = MotionPathPlugin.getClosestPoint(journeyPath, svgPoint);
        
        // Snap to the path
        gsap.set(this.target, {
          x: pathPoint.x - 15,
          y: pathPoint.y - 15
        });
        
        updateDragPosition.call(this);
      },
      onThrowUpdate: function() {
        updateDragPosition.call(this);
      }
    });

    // Initial position at the start of the path
    positionDragElementOnPath(0);
    updateDragPosition.call(Draggable.get(dragElement));

    function updateDragPosition() {
      // Get the current position of the drag element
      const dragBounds = dragElement.getBoundingClientRect();
      const svgBounds = svg.getBoundingClientRect();
      
      // Calculate relative position within SVG
      const relX = (dragBounds.left + dragBounds.width/2 - svgBounds.left) / svgBounds.width;
      const relY = (dragBounds.top + dragBounds.height/2 - svgBounds.top) / svgBounds.height;
      
      // Convert to SVG viewBox coordinates
      const svgViewBox = svg.viewBox.baseVal;
      const svgX = relX * svgViewBox.width;
      const svgY = relY * svgViewBox.height;
      
      console.log("Drag position in SVG coords:", svgX, svgY);
      
      // Calculate progress along the path (x-axis based)
      const progress = Math.max(0, Math.min(1, svgX / svgViewBox.width));
      
      // Hide all milestone infos initially
      milestoneInfos.forEach(info => info.style.opacity = "0");
      
      // Show relevant milestone info based on position
      milestones.forEach(milestone => {
        const milestoneX = parseFloat(milestone.getAttribute("cx"));
        const milestoneY = parseFloat(milestone.getAttribute("cy"));
        
        // Calculate distance to milestone
        const distance = Math.sqrt(
          Math.pow(svgX - milestoneX, 2) + 
          Math.pow(svgY - milestoneY, 2)
        );
        
        // If close enough to a milestone, show its info
        if (distance < 30) { // Adjust threshold as needed
          const milestoneId = milestone.getAttribute("data-milestone");
          const milestoneInfo = document.getElementById(`milestone-${milestoneId}`);
          
          if (milestoneInfo) {
            milestoneInfo.style.opacity = "1";
            milestoneInfo.style.left = `${(milestoneX / svgViewBox.width) * 100}%`;
            milestoneInfo.style.top = `${(milestoneY / svgViewBox.height) * 100 - 20}%`;
            milestoneInfo.style.transform = "translate(-50%, -100%)";
          }
        }
      });
    }

    function positionDragElementOnPath(progress) {
      try {
        const pathLength = journeyPath.getTotalLength();
        if (!pathLength) throw new Error("Could not get path length");
        
        const point = journeyPath.getPointAtLength(progress * pathLength);
        gsap.set(dragElement, {
          x: point.x - 15, // Assuming circle radius is 15
          y: point.y - 15,
          transformOrigin: "center center"
        });
      } catch (e) {
        console.error("Error positioning drag element:", e);
        // Fallback to start position
        gsap.set(dragElement, { x: 35, y: 135 });
      }
    }

    // Initial animation along the path
    gsap.fromTo(dragElement, 
      { 
        motionPath: {
          path: journeyPath,
          align: journeyPath,
          alignOrigin: [0.5, 0.5],
          autoRotate: true,
          start: 0,
          end: 0
        }
      },
      {
        motionPath: {
          path: journeyPath,
          align: journeyPath,
          alignOrigin: [0.5, 0.5],
          autoRotate: true,
          start: 0,
          end: 1
        },
        duration: 3,
        ease: "power1.inOut",
        onUpdate: function() {
          updateDragPosition.call(Draggable.get(dragElement));
        }
      }
    );

    // Add click handlers for milestone circles
    milestones.forEach((milestone, index) => {
      milestone.addEventListener('click', () => {
        const point = {
          x: parseFloat(milestone.getAttribute("cx")),
          y: parseFloat(milestone.getAttribute("cy"))
        };
        
        gsap.to(dragElement, {
          x: point.x - 15, // Assuming circle radius is 15
          y: point.y - 15,
          duration: 1,
          ease: "power2.inOut",
          onUpdate: function() {
            updateDragPosition.call(Draggable.get(dragElement));
          }
        });
      });
    });

  }
};

// =====================
// Experience Section Animations
// =====================
const ExperienceAnimations = {
  init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // Parallax background
    gsap.to('.parallax-bg', {
      y: -100,
      ease: "none",
      scrollTrigger: {
        trigger: '.work-experience-section',
        start: "top bottom",
        end: "bottom top",
        scrub: 0.5
      }
    });

    // Company header reveal animation
    gsap.utils.toArray('.experience-reveal').forEach((element, i) => {
      gsap.fromTo(element, 
        { y: 20, opacity: 0 }, 
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: '.company-header',
            start: "top 80%",
            toggleActions: "play none none none"
          },
          delay: i * 0.2
        }
      );
    });
    
    // Vertical timeline line animation
    gsap.fromTo('.experience-line', 
      { scaleY: 0 }, 
      { 
        scaleY: 1, 
        duration: 1.5, 
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: '.experience-cards-container',
          start: "top 70%",
          end: "bottom 20%",
          scrub: 0.5
        }
      }
    );
    
    // Experience cards staggered reveal
    const cards = gsap.utils.toArray('.experience-card');
    cards.forEach((card, i) => {
      gsap.fromTo(card, 
        { x: 30, opacity: 0 }, 
        { 
          x: 0, 
          opacity: 1, 
          duration: 0.8, 
          ease: "back.out(1.2)",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none none"
          },
          delay: i * 0.15
        }
      );
    });
    
    // Card dots pulsing animation
    gsap.to('.card-dot', {
      scale: 1.2,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.2
    });
    
    // Highlight project card special animation
    gsap.timeline({
      scrollTrigger: {
        trigger: '.project-highlight',
        start: "top 75%",
        toggleActions: "play none none none"
      }
    })
    .fromTo('.project-highlight', 
      { x: 30, opacity: 0, borderLeftWidth: 0 }, 
      { x: 0, opacity: 1, borderLeftWidth: 2, duration: 1, ease: "power3.out" }
    )
    .to('.project-highlight', {
      boxShadow: "0 0 15px rgba(51, 255, 51, 0.2)",
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    }, "-=0.5");
  }
};

// =====================
// Initialize Everything
// =====================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Terminal
  const terminal = new Terminal();
  if (!terminal.init()) console.error("Failed to initialize terminal");

  // Initialize Spotify Widget
  SpotifyWidget.initializeWidget();

  // Initialize other components
  setTimeout(() => MatrixRainEffect.createMatrixRain(), 1000);
  JourneyTimeline.init();
  ExperienceAnimations.init();
  MatrixRainEffect.addMatrixStyles();
});

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Terminal
  const terminal = new Terminal();
  if (!terminal.init()) console.error("Failed to initialize terminal");

  // Terminal UI setup
  const terminalTab = document.getElementById("terminal-tab");
  terminalTab?.addEventListener("click", (e) => {
    terminal.show();
    const rect = terminalTab.getBoundingClientRect();
    ConfettiEffect.trigger(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  // Corner trigger setup
  const cornerTrigger = document.getElementById("terminal-corner-trigger");
  const cornerButton = document.getElementById("terminal-corner-button");
  if (cornerTrigger && cornerButton) {
    cornerTrigger.addEventListener("mouseenter", () => cornerButton.classList.add("opacity-100", "scale-100"));
    cornerTrigger.addEventListener("mouseleave", () => {
      if (!cornerButton.matches(":hover")) cornerButton.classList.remove("opacity-100", "scale-100");
    });
    cornerButton.addEventListener("mouseleave", () => {
      if (!cornerTrigger.matches(":hover")) cornerButton.classList.remove("opacity-100", "scale-100");
    });
    cornerButton.addEventListener("click", () => terminal.show());
  }

  // Skill panels animation
  document.querySelectorAll('.skill-panel').forEach(panel => {
    gsap.set(panel.querySelector('.panel-front'), { rotationY: 0 });
    gsap.set(panel.querySelector('.panel-back'), { rotationY: 180 });
    
    let isFlipped = false;
    panel.addEventListener('mouseenter', () => {
      if (!isFlipped) {
        gsap.to(panel, { rotationY: 180, duration: 0.7, ease: 'power3.inOut' });
        isFlipped = true;
      }
    });
    panel.addEventListener('mouseleave', () => {
      if (isFlipped) {
        gsap.to(panel, { rotationY: 0, duration: 0.7, ease: 'power3.inOut' });
        isFlipped = false;
      }
    });
  });

  // Initialize Konami code
  const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiPosition = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key === konamiCode[konamiPosition]) {
      konamiPosition++;
      if (konamiPosition === konamiCode.length) {
        konamiPosition = 0;
        terminal.show();
        terminal.writeOutput("WOAH (*^^*) KONAMI CODE ACTIVATED!!!", "text-green-400 font-bold");
        terminal.window.classList.add("ring-4", "ring-green-400");
        setTimeout(() => terminal.window.classList.remove("ring-4", "ring-green-400"), 2000);
      }
    } else {
      konamiPosition = e.key === konamiCode[0] ? 1 : 0;
    }
  });

  // Mobile menu
  const menuToggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("menu");
  menuToggle?.addEventListener("click", () => {
    menu?.classList.toggle("hidden");
    if (!menu.classList.contains("hidden")) menu.classList.add("flex");
  });

  // Animate headline path
  animate(svg.createDrawable(".headline-path"), {
    draw: ["0 0", "0 1", "1 1"],
    ease: "inOutQuad",
    duration: 2000,
    delay: stagger(100),
    loop: true,
  });

  // Initialize all components
  initFooterTicker();
  SpotifyWidget.initializeWidget();
  setTimeout(() => MatrixRainEffect.createMatrixRain(), 1000);
  JourneyTimeline.init();
  ExperienceAnimations.init();
  MatrixRainEffect.addMatrixStyles();
});

// Terminal Journey Timeline
const TerminalJourney = {
  init() {
    // Elements
    this.timelineNodes = document.querySelectorAll('.timeline-node');
    this.journeyNavs = document.querySelectorAll('.journey-nav');
    this.timelineEntries = document.querySelectorAll('.timeline-entry');
    this.timelineProgress = document.querySelector('.timeline-progress');
    
    // Initial setup
    this.setupEventListeners();
    this.showEntry('2023');
    this.typeCommand();
  },
  
  setupEventListeners() {
    // Timeline node click events
    this.timelineNodes.forEach(node => {
      node.addEventListener('click', () => {
        const year = node.getAttribute('data-year');
        this.showEntry(year);
      });
    });
    
    // Navigation button click events
    this.journeyNavs.forEach(nav => {
      nav.addEventListener('click', () => {
        const year = nav.getAttribute('data-year');
        this.showEntry(year);
      });
    });
  },
  
  showEntry(year) {
    // Update active states
    this.timelineNodes.forEach(node => {
      node.classList.toggle('active', node.getAttribute('data-year') === year);
    });
    
    this.journeyNavs.forEach(nav => {
      nav.classList.toggle('active', nav.getAttribute('data-year') === year);
    });
    
    // Hide all entries first
    this.timelineEntries.forEach(entry => {
      entry.classList.add('hidden');
    });
    
    // Show selected entry with animation
    const selectedEntry = document.getElementById(`entry-${year}`);
    if (selectedEntry) {
      selectedEntry.classList.remove('hidden');
      
      // Animate typing effect for the details
      const details = selectedEntry.querySelectorAll('.entry-details p');
      details.forEach((line, index) => {
        const originalText = line.textContent;
        line.textContent = '';
        
        setTimeout(() => {
          this.typeText(line, originalText);
        }, 300 * index);
      });
    }
    
    // Update progress bar
    const progressMap = {
      '2023': '0%',
      '2024': '50%',
      '2025': '100%'
    };
    
    if (this.timelineProgress) {
      this.timelineProgress.style.width = progressMap[year] || '0%';
    }
  },
  
  typeCommand() {
    const commandText = document.querySelector('.command-text');
    if (!commandText) return;
    
    const text = commandText.textContent;
    commandText.textContent = '';
    
    this.typeText(commandText, text, 50, () => {
      // After command is typed, show first entry
      setTimeout(() => {
        this.showEntry('2023');
      }, 300);
    });
  },
  
  typeText(element, text, speed = 30, callback) {
    let i = 0;
    const typing = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(typing);
        if (callback) callback();
      }
    }, speed);
  }
};

// Initialize after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  TerminalJourney.init();
});
