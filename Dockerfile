FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Build the project
RUN npm run build

# Expose the port
EXPOSE 8080

# Set environment variables (override these when running the container)
ENV PORT=8080
ENV HOST=0.0.0.0
ENV REQUIRE_AUTH=true

# Run the remote server
CMD ["node", "dist/remote-server.js"]

