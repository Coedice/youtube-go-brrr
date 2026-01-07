# YouTube Go Brrr

A Chrome extension that speeds up YouTube videos with customisable playback speeds based on your preset rules.

## Features

- **Default Speed**: Set a default playback speed
- **Genre Speeds**: Customise speeds by video genre
- **Channel Speeds**: Customise speeds by YouTube channel
- **Video Speeds**: Customise speed by specific YouTube video
- **Priority System**: Video → Channel → Genre → Default speed

## Installation

### For End Users

1. Clone or download this repository
2. Open `chrome://extensions/` in your browser
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the project directory

### For Development

Clone and install dependencies:

```sh
git clone <repo-url>
cd youtube-brrr
make install
```

Load the extension in Chrome:

- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the project directory

## Usage

### Opening the Extension

Click the YouTube Go Brrr icon in your Chrome toolbar to open the settings popup.

### Speed Management

| Feature | Description | Priority |
| - | - | - |
| Default Speed | Set a default playback speed for all videos | Lowest |
| Genre Speed | Speed to apply to videos of the same genre | low |
| Channel Speed | Speed to apply to videos from the same channel | Medium |
| Video Speed | Speed for the current video alone | High |

## Available Commands

| Command | Purpose |
| - | - |
| `make install` | Install dependencies |
| `make test` | Run unit tests with coverage |
| `make lint` | Run linter |
| `make format` | Format code with Prettier |
| `make clean` | Clean build artifacts |
| `make help` | Show help |
