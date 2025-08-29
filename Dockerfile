# Use the official Bun image
FROM oven/bun:1 as base

# Install system dependencies and fonts for canvas rendering
RUN apt-get update && apt-get install -y \
    # Canvas dependencies
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # Font packages for proper text rendering
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the index function file
COPY index.ts ./

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the index function service
CMD ["bun", "run", "index.ts"]