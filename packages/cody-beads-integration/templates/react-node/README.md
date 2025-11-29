# React + Node.js Template

Modern web application with React frontend and Node.js backend, integrated with Cody-Beads synchronization.

## Features

- ⚛️  React 18 with modern hooks
- 🔧  Node.js with Express.js
- 📊  Cody-to-Beads integration
- 🔄  Automatic synchronization (15 minutes)
- 🧪  Jest testing setup
- 🐳  Docker support
- 🌐  Development server with hot reload

## Quick Start

```bash
# Apply template
cody-beads template apply react-node --name my-web-app

# Setup and run
cd my-web-app
npm install
npm run dev
```

## Project Structure

```
my-web-app/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/            # Node.js API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── app.js
│   ├── package.json
│   └── tests/
├── docker-compose.yml   # Development environment
├── cody-beads.config.json # Configuration
└── README.md
```

## Configuration

This template configures Cody-Beads integration for:

- **Sync Direction**: Cody → Beads (frontend-focused)
- **Conflict Resolution**: Cody wins (frontend source of truth)
- **Auto Sync**: Every 15 minutes
- **Included Labels**: `frontend`, `backend`, `bug`, `enhancement`

## Development Scripts

```bash
# Frontend development
cd frontend
npm run dev

# Backend development
cd backend
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Docker Development

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up frontend
docker-compose up backend
```

## Synchronization

The template automatically synchronizes:

### From Cody to Beads
- Frontend issues → Beads features
- Backend bugs → Beads issues
- Pull requests → Beads requirements

### Preserved Data
- Issue comments and discussions
- Labels and milestones
- Assignees and due dates

## Customization

### Adding New Features

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Develop in appropriate directory (`frontend/` or `backend/`)
3. Test your changes: `npm test`
4. Commit and push

### Configuration Updates

Edit `cody-beads.config.json`:

```json
{
  "sync": {
    "defaultDirection": "cody-to-beads",
    "conflictResolution": "cody-wins",
    "autoSync": true,
    "syncInterval": 15,
    "includeLabels": ["frontend", "backend", "bug", "enhancement"]
  }
}
```