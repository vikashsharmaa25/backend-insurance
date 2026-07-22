FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies using clean install
RUN npm ci

# Copy application source code
COPY . .

# Expose default port
EXPOSE 5000

# Start application server
CMD ["node", "src/server.js"]
