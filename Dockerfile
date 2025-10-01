# Multi-stage build for smaller final image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source files
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 8080

# Set environment variables (override these when running the container)
ENV PORT=8080
ENV HOST=0.0.0.0
ENV REQUIRE_AUTH=true

# Run the remote server
CMD ["node", "dist/remote-server.js"]

