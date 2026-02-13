FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

RUN npm install -g serve

ENV PORT=8080

EXPOSE 8080

CMD ["serve","-s","build","-l","8080"]