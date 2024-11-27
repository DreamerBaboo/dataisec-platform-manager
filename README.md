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
├── frontend/                 # React frontend application
│   ├── src/                 # Source code
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
├── backend/                 # Express backend application
│   ├── controllers/        # Request handlers
│   ├── routes/            # API routes
│   ├── services/         # Business logic
│   ├── models/          # Data models
│   └── utils/          # Utility functions
├── Package-script/      # Build and deployment scripts
├── deployment.yaml     # Kubernetes deployment configuration
├── docker-compose.yml  # Docker compose configuration
└── build-*.sh         # Docker build scripts
```

## Development Setup

1. Clone the repository:
```bash
git clone http://192.168.170.12/scott.wang/dataisec-platform-manager/dataisec-platform-manager.git
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

## Deployment Process

### 1. Local Development Deployment
1. Install dependencies:
```bash
npm run install:all
```

2. Configure environment variables:
```bash
cp .env_sample .env
# Edit .env with your configurations
```

3. Start development servers:
```bash
npm run dev
```

### 2. Docker Deployment
1. Build Docker images:
```bash
# For AMD64 architecture
./build-docker-amd64-local.sh

# For multi-platform build
./build-multiplatform-docker.sh
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

### 3. Kubernetes Deployment
1. Configure Kubernetes settings:
```bash
# Generate Kubernetes configurations
./generate-config.sh

# Review deployment configuration
vim deployment.yaml
```

2. Deploy to Kubernetes:
```bash
# Using deploy script
./deploy.sh

# Or manually apply configurations
kubectl apply -f deployment.yaml
```

3. Verify deployment:
```bash
kubectl get pods -n dataisec
kubectl get svc -n dataisec
```

## Environment Variables Configuration

### Required Environment Variables

#### Backend Configuration
```env
# Server Configuration
NODE_ENV=production
PORT=3001
API_BASE_URL=http://localhost:3001

# JWT Configuration
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=24h

# OpenSearch Configuration
OPENSEARCH_URL=https://your-opensearch-host:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-password
OPENSEARCH_POD_METRICS_INDEX=metricbeat-*
OPENSEARCH_LOGS_INDEX=filebeat-*

# Kubernetes Configuration
KUBECONFIG=/etc/kubernetes/admin.conf
KUBERNETES_SERVICE_HOST=https://kubernetes.default.svc
KUBERNETES_SERVICE_PORT=443
```

#### Frontend Configuration
```env
# Development
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_PORT=3001

# Production
NODE_ENV=production
```

### Environment Setup Instructions

1. Development Environment:
   - Copy `.env_sample` to `.env`
   - Update values according to your local setup
   - Ensure OpenSearch and Kubernetes clusters are accessible

2. Production Environment:
   - Use Kubernetes secrets for sensitive values
   - Configure environment variables through deployment.yaml
   - Use service account tokens for Kubernetes authentication

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

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
