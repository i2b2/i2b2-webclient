
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
 
RUN apt-get update && \
    apt-get install -y apache2 openssl php libapache2-mod-php php-curl php-xml && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
 
EXPOSE 80 443
ADD docker/run-httpd.sh /run-httpd.sh
RUN chmod +x /run-httpd.sh 
 
COPY docker/i2b2_proxy.conf /etc/apache2/sites-available/

RUN sed -i 's/9090/8080/g' \
    /etc/apache2/sites-available/i2b2_proxy.conf

RUN sed 's/9090/8080/g' \
    /etc/apache2/sites-available/i2b2_proxy.conf \
    > /etc/apache2/sites-available/ssl.conf
 
# Enable the proxy configuration
RUN a2ensite i2b2_proxy.conf && a2enmod ssl proxy proxy_http
 
COPY . /var/www/html/webclient/

# Environment variable for application IP address
ARG APP_IP=localhost
ENV APP_IP=${APP_IP}

# Set the startup script as the default command
CMD ["/run-httpd.sh"]