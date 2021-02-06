FROM nginx:alpine
COPY /public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
COPY eftbarters.link.key /var/data/eftbarters.link.key
COPY nginx_bundle_9145be3058eb.crt /var/data/eftbarters.link.crt