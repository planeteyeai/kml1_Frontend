# Stage 1: Build the React application
FROM node:18-slim AS build

WORKDIR /app

COPY package*.json ./
# Use legacy-peer-deps to avoid dependency resolution issues
RUN npm install --legacy-peer-deps

COPY . .

# Set environment variables for production build
ENV CI=false
ENV NODE_OPTIONS=--max-old-space-size=4096
# Empty = use bundled fallback in src/config.js (hosted Railway backend).
# Override at build time: docker build --build-arg REACT_APP_API_URL=https://your-api.example.com .
ARG REACT_APP_API_URL=
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN npm run build

# Stage 2: Serve the production build
FROM node:18-slim

WORKDIR /app

# Install 'serve' to run the static site
RUN npm install -g serve

# Copy only the build output from the build stage
COPY --from=build /app/build ./build

ENV PORT=8080
# Runtime API base (matches HOSTED_KML_API_BASE / src/config.js). Override on Railway if the backend URL changes.
ENV KML_BACKEND_URL=https://kml-backend-production-501c.up.railway.app
EXPOSE 8080

# Inject API URL into runtime-config.js on each start, then serve static files
CMD ["sh", "-c", "echo \"window.__KML_API_URL__='${KML_BACKEND_URL:-https://kml-backend-production-501c.up.railway.app}';\" > build/runtime-config.js && exec serve -s build -l ${PORT:-8080}"]