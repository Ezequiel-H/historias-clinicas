# Electron App Setup

This application has been converted to an Electron desktop application.

## Prerequisites

Make sure you have Node.js installed (v18 or higher recommended).

## Installation

1. Install dependencies:
```bash
npm install
```

This will install all dependencies including Electron, electron-builder, and other required packages.

## Development

### Run in Development Mode

To run the app in development mode with hot-reload:

```bash
npm run electron:dev
```

This will:
- Start the Vite dev server
- Wait for it to be ready
- Launch Electron with the dev server URL

### Build for Production

To build the Electron app for your current platform:

```bash
npm run electron:build
```

This will:
- Compile TypeScript files
- Build the React app
- Package everything into a distributable Electron app

The output will be in the `release/` directory.

### Build Without Packaging

To build without creating an installer:

```bash
npm run electron:pack
```

## Project Structure

```
historias-clinicas/
├── electron/
│   ├── main.ts          # Electron main process
│   └── preload.ts       # Preload script for secure IPC
├── src/                 # React application source
├── dist/                # Built React app (generated)
├── dist-electron/       # Compiled Electron files (generated)
└── release/             # Packaged Electron apps (generated)
```

## Configuration

### API Base URL

The app connects to the backend API. Make sure your backend is running and configure the API URL:

- Create a `.env` file in the root directory
- Add: `VITE_API_BASE_URL=http://localhost:3000/api`

Or set it as an environment variable when running the app.

### Electron Builder Configuration

The Electron builder configuration is in `package.json` under the `build` section. You can customize:
- App ID
- Product name
- Icons
- Build targets for different platforms

## Notes

- The app uses HashRouter instead of BrowserRouter for better Electron compatibility
- The API service has been updated to work with Electron's navigation
- Context isolation is enabled for security
- Node integration is disabled in the renderer process

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, update the port in `vite.config.ts` and `electron/main.ts`.

### Build Errors

If you encounter build errors:
1. Make sure all dependencies are installed: `npm install`
2. Clear build directories: `rm -rf dist dist-electron release`
3. Try building again: `npm run build:electron`

### Electron Not Starting

If Electron doesn't start:
1. Check that the Vite dev server is running on the expected port
2. Verify that `dist-electron/main.js` exists after building
3. Check the console for error messages

