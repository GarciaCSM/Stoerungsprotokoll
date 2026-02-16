# Dockerfile for Störungsprotokoll backend
# Installs unixODBC + Microsoft ODBC Driver so the `odbc` npm package works in the container.
FROM node:22-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV ACCEPT_EULA=Y

# Install system dependencies and ODBC driver
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    gnupg2 \
    apt-transport-https \
    unixodbc \
    unixodbc-dev \
  && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC Driver for SQL Server (msodbcsql18)
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
  && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
  && apt-get update \
  && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install dependencies (production)
COPY package*.json ./
RUN npm ci --only=production

# Copy app
COPY . .

# Expose port (server uses process.env.PORT || 3001)
EXPOSE 3001

# Start the server
CMD ["npm", "run", "server"]
