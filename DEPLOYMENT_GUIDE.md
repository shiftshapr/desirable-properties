# Deployment Guide

This guide covers all the different ways to update and deploy the Meta-Layer Desirable Properties web application.

## 🚀 Quick Reference

### Web App Updates
```bash
cd /home/ubuntu/desirable-properties/web-app/
# Make your changes...
./deploy.sh
```

### Data Updates
```bash
# Edit files in data/submissions/structured/
# Hot reloading - no deployment needed!
```

## 📁 Directory Structure

| Purpose | Location | Description |
|---------|----------|-------------|
| **Development** | `/home/ubuntu/desirable-properties/web-app/` | Edit code here |
| **Production** | `/var/www/app.themetalayer.org/public/` | Users see this |
| **Data** | `/home/ubuntu/desirable-properties/data/` | Hot-reloaded |
| **PM2 Process** | `app-themetalayer` | Manages running app |

## 🔄 Update Methods

### Method 1: Quick Deployment (Recommended)

For regular web app updates:

```bash
cd /home/ubuntu/desirable-properties/web-app/
# Make your changes...
./deploy.sh
```

**What this does:**
1. Copies files to production directory
2. Installs dependencies
3. Builds the application
4. Restarts PM2 process

### Method 2: Manual Deployment

For more control over the deployment process:

```bash
cd /home/ubuntu/desirable-properties/web-app/
# Make your changes...

# Copy to production
sudo cp -r * /var/www/app.themetalayer.org/public/

# Install dependencies and build
cd /var/www/app.themetalayer.org/public/
npm install --production
npm run build

# Restart the app
pm2 restart app-themetalayer
```

### Method 3: Automated Deployment (GitHub Actions)

For automated deployments when pushing to GitHub:

```bash
cd /home/ubuntu/desirable-properties/web-app/
# Make your changes...

git add .
git commit -m "Update web app"
git push origin main
# GitHub Actions automatically deploys
```

### Method 4: Data Updates (Hot Reloading)

For updating submissions and data:

```bash
# Edit files in data/submissions/structured/
# The app automatically picks up changes - no deployment needed!
```

## 🛠️ Monitoring and Maintenance

### Check App Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs app-themetalayer
```

### Monitor Resources
```bash
pm2 monit
```

### Restart App
```bash
pm2 restart app-themetalayer
```

### Check Production Files
```bash
ls -la /var/www/app.themetalayer.org/public/
```

## 🔧 Troubleshooting

### Common Issues

1. **Port 3000 in use**
   ```bash
   pm2 stop app-themetalayer
   sudo lsof -ti:3000 | xargs sudo kill -9
   pm2 start app-themetalayer
   ```

2. **Build errors**
   ```bash
   cd /var/www/app.themetalayer.org/public/
   npm install --production
   npm run build
   ```

3. **Permission issues**
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/app.themetalayer.org/
   ```

4. **Nginx issues**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Log Locations

- **PM2 logs**: `pm2 logs app-themetalayer`
- **Nginx logs**: `/var/log/nginx/error.log`
- **Application logs**: Check PM2 logs for details

## 📋 Environment Variables

### Development
Create `.env.local` in the web-app directory:
```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_SUBMISSIONS=true
```

### Production
Environment variables are set in `/var/www/app.themetalayer.org/public/.env.production`

## 🔐 Security Notes

- **Never edit files directly in `/var/www/`** - always use the deployment process
- **Keep API keys secure** - don't commit them to version control
- **Regular backups** - the data directory contains important submissions
- **Monitor logs** - check for errors and performance issues

## 📞 Support

If you encounter issues:

1. Check the logs: `pm2 logs app-themetalayer`
2. Verify file permissions
3. Test the build process locally first
4. Contact the Meta-Layer Initiative team

---

*This guide covers the most common deployment scenarios. For advanced configurations, see the individual README files in each directory.* 