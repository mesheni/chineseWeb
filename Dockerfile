FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# DB is auto-seeded on first app start

HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

EXPOSE 3000

CMD ["npm", "start"]