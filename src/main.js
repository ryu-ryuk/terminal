document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded");

    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.querySelector('.terminal');

    if (!terminalInput || !terminalOutput) {
        console.error('Terminal input or output elements not found.');
        return;
    }

    terminalInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            processCommand(terminalInput.value.trim());
            terminalInput.value = '';
        }
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
