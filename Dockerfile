FROM ubuntu:bionic

ENV ADMIN_USER=admin@shinobi.video \
    ADMIN_PASSWORD=admin \
    CRON_KEY=fd6c7849-904d-47ea-922b-5143358ba0de \
    PLUGINKEY_MOTION=b7502fd9-506c-4dda-9b56-8e699a6bc41c \
    PLUGINKEY_OPENCV=f078bcfe-c39a-4eb5-bd52-9382ca828e8a \
    PLUGINKEY_OPENALPR=dbff574e-9d4a-44c1-b578-3dc0f1944a3c \
    #leave these ENVs alone unless you know what you are doing
    DB_USER=majesticflame \
    DB_PASSWORD=mizukagesbluedress \
    DB_HOST=localhost \
    DB_DATABASE=ccio \
    DB_ROOT_PASSWORD=mizukagesbluedress \
    DB_ROOT_USER=root

RUN mkdir -p /home/Shinobi /config /var/lib/mysql

RUN apt update -y
RUN apt install wget curl net-tools -y

# Install Node.js
RUN wget https://deb.nodesource.com/setup_12.x
RUN chmod +x setup_12.x
RUN ./setup_12.x
RUN apt install nodejs -y
RUN rm setup_12.x

# Install MariaDB server... the debian way
RUN set -ex; \
	{ \
		echo "mariadb-server" mysql-server/root_password password '${DB_ROOT_PASSWORD}'; \
		echo "mariadb-server" mysql-server/root_password_again password '${DB_ROOT_PASSWORD}'; \
	} | debconf-set-selections; \
	apt-get update; \
	apt-get install -y \
		"mariadb-server" \
        socat \
	; \
    find /etc/mysql/ -name '*.cnf' -print0 \
		| xargs -0 grep -lZE '^(bind-address|log)' \
		| xargs -rt -0 sed -Ei 's/^(bind-address|log)/#&/'

RUN sed -ie "s/^bind-address\s*=\s*127\.0\.0\.1$/#bind-address = 0.0.0.0/" /etc/mysql/my.cnf

# Install FFmpeg

RUN apt install -y software-properties-common \
        libfreetype6-dev \
        libgnutls28-dev \
        libmp3lame-dev \
        libass-dev \
        libogg-dev \
        libtheora-dev \
        libvorbis-dev \
        libvpx-dev \
        libwebp-dev \
        libssh2-1-dev \
        libopus-dev \
        librtmp-dev \
        libx264-dev \
        libx265-dev \
        yasm && \
    apt install -y \
        build-essential \
        bzip2 \
        coreutils \
        gnutls-bin \
        nasm \
        tar \
        x264

RUN apt install -y \
                ffmpeg \
                git \
                make \
                g++ \
                gcc \
                pkg-config \
                python3 \
                wget \
                tar \
                sudo \
                xz-utils
RUN update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-7 800 --slave /usr/bin/g++ g++ /usr/bin/g++-7

####


WORKDIR /home/Shinobi
COPY . .
RUN npm i npm@latest -g && \
    npm install pm2 -g && \
    npm install --unsafe-perm && \
    npm audit fix --force
COPY ./Docker/pm2.yml ./

# Copy default configuration files
# COPY ./config/conf.json ./config/super.json /home/Shinobi/
RUN chmod -f +x /home/Shinobi/Docker/init.sh

VOLUME ["/home/Shinobi/videos"]
VOLUME ["/home/Shinobi/plugins"]
VOLUME ["/config"]
VOLUME ["/customAutoLoad"]
VOLUME ["/var/lib/mysql"]

EXPOSE 8080

ENTRYPOINT ["/home/Shinobi/Docker/init.sh"]

CMD [ "pm2-docker", "pm2.yml" ]
