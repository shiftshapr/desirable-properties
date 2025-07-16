# Deployment Guide for app.themetalayer.org

## Overview
This guide covers deploying the Meta-Layer Desirable Properties web application to a Vultr server.

## Server Information
- **Domain**: app.themetalayer.org
- **Production Path**: `/var/www/app.themetalayer.org/public`
- **Development Path**: `/home/ubuntu/desirable-properties`
- **Server**: Vultr Ubuntu instance

## Pre-Deployment Checklist

### 1. Local Preparation
```bash
# Ensure the application builds successfully
cd /Users/daveed/Public/meta/src/metaweb/desirable-properties/web-app
npm run build

# Create deployment package
tar -czf desirable-properties-web.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  .
```

### 2. Server Dependencies
Ensure your Vultr server has:
- Node.js 18+ 
- npm
- PM2 (process manager)
- Nginx (reverse proxy)

## Deployment Steps

### 1. Transfer Files
```bash
# From your local machine, upload to server
scp desirable-properties-web.tar.gz ubuntu@YOUR_SERVER_IP:/home/ubuntu/

# SSH into server
ssh ubuntu@YOUR_SERVER_IP

# Extract files
cd /home/ubuntu
tar -xzf desirable-properties-web.tar.gz
mv web-app desirable-properties

# Copy to production directory
sudo mkdir -p /var/www/app.themetalayer.org
sudo cp -r /home/ubuntu/desirable-properties /var/www/app.themetalayer.org/public
```

### 2. Install Dependencies & Build
```bash
cd /var/www/app.themetalayer.org/public
sudo npm install
sudo npm run build

# Set proper ownership
sudo chown -R ubuntu:ubuntu /var/www/app.themetalayer.org
```

### 3. Environment Configuration
```bash
# Create production environment file
cat > /var/www/app.themetalayer.org/public/.env.production << EOF
NODE_ENV=production
PORT=3000
EOF
```

### 4. Process Management with PM2
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > /var/www/app.themetalayer.org/public/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'app-themetalayer',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/app.themetalayer.org/public',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start the application
cd /var/www/app.themetalayer.org/public
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Configuration
```bash
# Create Nginx site configuration
sudo tee /etc/nginx/sites-available/app.themetalayer.org << EOF
server {
    listen 80;
    server_name app.themetalayer.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/app.themetalayer.org /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate (Optional but Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d app.themetalayer.org
```

## Verification Steps

### 1. Check Application Status
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs app-themetalayer

# Check if app is responding
curl http://localhost:3000/api/desirable-properties
```

### 2. Test API Endpoints
```bash
# Test main API
curl http://app.themetalayer.org/api/desirable-properties

# Test search
curl "http://app.themetalayer.org/api/search?q=privacy"

# Test submissions
curl http://app.themetalayer.org/api/submissions
```

### 3. Verify Web Interface
Visit `http://app.themetalayer.org` in your browser to ensure:
- Page loads correctly
- Search functionality works
- Category filtering works
- API calls are successful

## Troubleshooting

### Common Issues
1. **Port 3000 already in use**: Kill existing processes with `sudo lsof -ti:3000 | xargs sudo kill -9`
2. **Permission denied**: Ensure proper ownership with `sudo chown -R ubuntu:ubuntu /var/www/app.themetalayer.org`
3. **Nginx not serving**: Check config with `sudo nginx -t` and restart `sudo systemctl restart nginx`
4. **API 404 errors**: Verify file structure and PM2 status

### Useful Commands
```bash
# Restart application
pm2 restart app-themetalayer

# View logs
pm2 logs app-themetalayer --lines 50

# Check server resources
pm2 monit

# Update application
cd /var/www/app.themetalayer.org/public
git pull  # if using git
npm run build
pm2 restart app-themetalayer
```

## Maintenance

### Regular Updates
1. Update dependencies: `npm update`
2. Rebuild application: `npm run build`
3. Restart PM2: `pm2 restart app-themetalayer`

### Monitoring
- Use `pm2 monit` for real-time monitoring
- Check Nginx logs: `sudo tail -f /var/log/nginx/access.log`
- Monitor disk space and memory usage

## Development Workflow on Server

For development work in `/home/ubuntu/desirable-properties`:
```bash
cd /home/ubuntu/desirable-properties
npm run dev  # Runs on port 3000 (development)

# When ready to deploy changes:
npm run build
sudo cp -r ./* /var/www/app.themetalayer.org/public/
pm2 restart app-themetalayer
```

---

**Note**: Make sure your domain DNS is pointing to your Vultr server IP address before accessing app.themetalayer.org. 