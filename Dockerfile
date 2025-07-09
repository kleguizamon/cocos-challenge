FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV DATABASE_HOST=ep-fancy-voice-a8usl8mp-pooler.eastus2.azure.neon.tech \
    DATABASE_PORT=5432 \
    DATABASE_USERNAME=neondb_owner \
    DATABASE_PASSWORD=npg_SLDxY7hZMt3T \
    DATABASE_NAME=neondb \
    PORT=4000

EXPOSE 4000
CMD ["node", "dist/src/main"]