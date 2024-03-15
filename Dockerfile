FROM nginx:alpine
COPY public /usr/share/nginx/html
# COPY /build/nginx/ /etc/nginx/

EXPOSE 80 443

RUN apk update && apk add bash && apk add certbot certbot-nginx && apk add openrc && apk add busybox-openrc
# RUN echo -e "0 1 * * 0 cp /imagevolume/* /usr/share/nginx/html/images" >> /etc/crontabs/root
# RUN cp /imagevolume/* /usr/share/nginx/html/images