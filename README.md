# DataISEC Platform Manager

This project is a console application for a database activity monitoring system (DAM), designed as a fullstack application with separated frontend and backend.

## Features

- User authentication and authorization
- Dashboard for system and pod metrics
- Kubernetes pod management
- System logs viewer
- User profile management
- Internationalization support (English and Chinese)
- Dark and light mode

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Docker
- Kubernetes cluster
- Helm v3
- OpenSearch cluster

## Project Structure

```
.
├── frontend/               # React frontend application
├── backend/               # Express backend application
├── k8s/                   # Kubernetes and Helm configurations
│   └── dataisec-platform/
│       ├── templates/     # Helm templates
│       └── values.yaml    # Helm values
└── deploy.sh             # Deployment script
```

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/dataisec-platform-manager.git
cd dataisec-platform-manager
```

2. Install dependencies:
```bash
# Install all dependencies (frontend and backend)
npm run install:all
```

3. Configure environment variables:
```bash
# Backend environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your configurations
```

4. Start development servers:
```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them separately:
# Frontend (http://localhost:5173)
cd frontend && npm run dev

# Backend (http://localhost:3001)
cd backend && npm run dev
```

## Production Build

1. Build the application:
```bash
# Build frontend and copy to backend/public
npm run build

# Or build step by step:
npm run build:clean      # Clean previous builds
npm run build:frontend   # Build frontend
npm run build:copy      # Copy frontend build to backend
```

2. Start production server:
```bash
# Start backend server in production mode
cd backend && npm start
```

## Docker Build

1. Build Docker images:
```bash
# Build backend image
docker build -t dataisec/backend:latest ./backend

# Build frontend image
docker build -t dataisec/frontend:latest ./frontend
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster with access configured
- Helm v3 installed
- kubectl configured with cluster access

### Deploy with Helm

1. Configure deployment:
```bash
# Edit values file
vim k8s/dataisec-platform/values.yaml
```

2. Deploy using Helm:
```bash
# Using deploy script
chmod +x deploy.sh
./deploy.sh

# Or manually
helm upgrade --install dataisec-platform ./k8s/dataisec-platform \
  --namespace dataisec \
  --create-namespace \
  --values ./k8s/dataisec-platform/values.yaml
```

3. Verify deployment:
```bash
# Check pods status
kubectl get pods -n dataisec

# Check services
kubectl get svc -n dataisec

# Check ingress
kubectl get ingress -n dataisec
```

### Access the Application

- Development: 
  - Frontend: http://localhost:5173
  - Backend API: http://localhost:3001

- Production:
  - Single server: http://localhost:3001
  - Kubernetes: http://dataisec.local (configure your hosts file)

## Environment Variables

### Backend
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-jwt-secret
OPENSEARCH_URL=https://your-opensearch-host:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-password
```

### Frontend (Development)
```env
VITE_API_URL=http://localhost:3001
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
