FROM nginx:alpine
COPY /public/ /usr/share/nginx/html/
COPY /nginx/ /etc/nginx/

EXPOSE 80 443

RUN apk update && apk add bash && apk add certbot certbot-nginx && apk add openrc