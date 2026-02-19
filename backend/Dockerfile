FROM node:20-alpine

# Prisma requires openssl on Alpine
RUN apk add --no-cache openssl

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY shared /app/shared
COPY backend .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
