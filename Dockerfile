FROM nginx:alpine
COPY public /etc/nginx/html
# COPY /build/nginx/ /etc/nginx/

EXPOSE 80 443

RUN apk update && apk add bash && apk add certbot certbot-nginx && apk add openrc