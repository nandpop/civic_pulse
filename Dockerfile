# Use lightweight Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root and workspaces package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies for both client and server
RUN npm run install-all

# Copy all source files
COPY . .

# Build the client production assets
RUN npm run build --prefix client

# Expose port (Cloud Run sets PORT env, but 5000 as fallback)
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start server
CMD ["node", "server/index.js"]
