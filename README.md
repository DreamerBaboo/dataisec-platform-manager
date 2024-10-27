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

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Kubernetes cluster (for pod management features)
- OpenSearch cluster (for metrics and logs)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/dataisec-platform-manager.git
   cd dataisec-platform-manager
   ```

2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd ../frontend
   npm install
   ```

4. Set up environment variables:
   - Create a `.env` file in the `backend` directory and add necessary variables (e.g., JWT_SECRET, OPENSEARCH_ENDPOINT)
   - Create a `.env` file in the `frontend` directory if needed

### Running the application

1. Start the backend server:
   ```
   cd backend
   npm start
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
