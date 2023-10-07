# Stage 1: Compile and Build angular codebase
FROM node:lts-alpine as build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx ng build

# Stage 2: Serve app with nginx server
FROM nginx:alpine
COPY --from=build /app/dist/forms /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]