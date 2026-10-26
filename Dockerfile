FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .
USER node
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.cjs"]
