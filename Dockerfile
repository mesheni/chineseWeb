FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx sequelize-cli db:migrate || node seed.js || true

EXPOSE 3000

CMD ["npm", "start"]