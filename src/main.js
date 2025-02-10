document.addEventListener("DOMContentLoaded", function () {
    const terminalInput = document.getElementById("terminal-input");
    const terminalDiv = document.querySelector(".terminal");

    terminalDiv.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent interference from parent elements
        terminalInput.focus();
    });

    // Ensure it stays focused unless user clicks elsewhere
    document.addEventListener("click", function (event) {
        if (!terminalDiv.contains(event.target) && event.target !== terminalInput) {
            terminalInput.blur();
        }
    });

    // Ensure Enter key appends input to terminal
    terminalInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && this.value.trim() !== "") {
            const newLine = document.createElement("p");
            newLine.className = "text-green-400";
            newLine.textContent = `ryu@archy:~$ ${this.value}`;
            terminalDiv.appendChild(newLine);
            this.value = "";
        }
    });
});
document.getElementById("menu-toggle").addEventListener("click", function () {
    document.getElementById("menu").classList.toggle("hidden");
});


    function processCommand(command) {
        console.log('Command entered:', command);
        const lowerCmd = command.toLowerCase();
        switch (lowerCmd) {
            case 'help':
                terminalOutput.innerHTML += `<p>> Available commands: help, clear, projects, skills, contact</p>`;
                break;
            case 'clear':
                terminalOutput.innerHTML = '';
                break;
            case 'projects':
                terminalOutput.innerHTML += `<p>> Redirecting to projects...</p>`;
                window.location.href = '#projects';
                break;
            case 'skills':
                terminalOutput.innerHTML += `<p>> Redirecting to skills...</p>`;
                window.location.href = '#skills';
                break;
            case 'contact':
                terminalOutput.innerHTML += `<p>> Redirecting to contact...</p>`;
                window.location.href = '#contact';
                break;
            default:
                terminalOutput.innerHTML += `<p class="text-red-400">> Unknown command: ${command}</p>`;
        }
    }

    // Move fetchSpotifyData call here, guaranteeing the DOM elements exist.
    function fetchSpotifyData() {
        const mockData = { song: 'Song Name', artist: 'Artist Name' };
        const spotifySongEl = document.getElementById('spotify-song');
        if (spotifySongEl) {
            spotifySongEl.textContent = `${mockData.song} - ${mockData.artist}`;
        } else {
            console.error('Spotify element not found.');
        }
    }
    fetchSpotifyData();

});
