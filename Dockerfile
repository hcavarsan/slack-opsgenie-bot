# Use Node.js LTS (Hydrogen)
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port (for local development)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD [ "pnpm", "start" ]
