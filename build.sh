yarn build &&
docker build -t barter-buddy-website . &&
docker save barter-buddy-website -o barter-buddy-website.tar &&
eval `ssh-agent` &&
scp barter-buddy-website.tar root@104.248.234.245:./