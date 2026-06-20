# --- Base Stage ---
# Changed from alpine to slim to support bcrypt compilation
FROM node:20-slim AS base
WORKDIR /usr/src/app
COPY package*.json ./

# --- Development Stage ---
FROM base AS development
RUN npm install
COPY . .
EXPOSE 8000
# This perfectly maps to your "dev" script using ts-node-dev
CMD ["npm", "run", "dev"]

# --- Build Stage ---
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:20-slim AS production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 8000
CMD ["npm", "run", "start"]