FROM nginx:alpine
COPY /public/ /usr/share/nginx/html/
COPY /nginx/ /etc/nginx/

EXPOSE 80 443

RUN apk add certbot certbot-nginx && apk add openrc && rc-update add nginx

ENTRYPOINT ["/bin/bash"]
CMD ["certbot --nginx --non-interactive --agree-tos -m bbenton91.dev@gmail.com -d eftbarters.com,www.eftbarters.com"]