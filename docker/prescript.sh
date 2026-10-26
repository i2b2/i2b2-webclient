#!/bin/bash 
printenv
echo "running prescript with arg:$1"
cat /conftemp/etc/httpd/conf.d/i2b2_proxy.conf |sed -e s/9090/8080/ > /etc/httpd/conf.d/i2b2_proxy.conf
cat /conftemp/etc/httpd/conf.d/ssl.conf |sed -e s/9090/8080/ > /etc/httpd/conf.d/ssl.conf 
