FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run server:build
RUN npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV HOST=0.0.0.0 PORT=8787
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
EXPOSE 8787
CMD ["node", "dist-server/main.mjs"]
