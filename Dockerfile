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

RUN npm run build

# Stage 2: Serve the production build
FROM node:18-slim

WORKDIR /app

# Install 'serve' to run the static site
RUN npm install -g serve

# Copy only the build output from the build stage
COPY --from=build /app/build ./build

ENV PORT=8080
EXPOSE 8080

# Start 'serve' on the specified port
CMD ["serve", "-s", "build", "-l", "8080"]