FROM python:3.12-slim-bookworm

USER root

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:1 \
    LANG=C.UTF-8 \
    TZ=Asia/Shanghai \
    PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright \
    PIP_INDEX_URL=https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple
    

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget gnupg curl git ca-certificates bc gzip less net-tools poppler-utils psmisc socat tar unzip zip \
        libgtk-3-0 libnss3 libxss1 libasound2 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxshmfence1 \
        fonts-noto-color-emoji fonts-wqy-microhei wkhtmltopdf x11vnc xvfb novnc websockify pandoc

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest pnpm yarn wrangler && \
    apt-get clean && rm -rf /var/lib/apt/lists/*  && npm cache clean --force

RUN pip install playwright==1.54.0 && \
    playwright install chromium --no-shell

RUN pip install --no-cache-dir \
    matplotlib pandas openpyxl numpy biopython scikit-learn seaborn pdfkit lxml akshare pillow requests \
    python-pptx flask beautifulsoup4 && pip cache purge

COPY --chmod=+x start.sh pw-config.json /etc

RUN mkdir /workspace && chmod 777 /workspace

WORKDIR /workspace

CMD ["bash"]
