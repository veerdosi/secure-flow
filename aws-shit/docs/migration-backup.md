# SecureFlow Migration Backup - June 14, 2025

## Current Deployment State

### Environment Variables (Production)
```
MONGODB_URI=mongodb+srv://veerdosi00:veerveer@cluster0.mavhzaj.mongodb.net/Secure-Flow?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=edaed40c257658ca7ec6930884b888a713cfd97024aa5b8d68905ea41670b692a9ae3eae3ea824d8bd5204cd1a0afbc56d6f3344f32f6787723086fa547e72b4
GEMINI_API_KEY=AIzaSyAmscjuIGG7gz7T_5K8aXw-KD0VkSpxakw
GEMINI_MODEL=gemini-pro
GOOGLE_CLIENT_ID=714013846272-cndmh92r1uogrembg4ii5opuaj7bcpu3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### Current Services
1. **Frontend**: Vercel (Next.js) - ✅ Keep
2. **Backend API**: Render.com (Express.js) - 🔄 Migrate to Lambda
3. **Cloud Functions**: Google Cloud Functions - 🔄 Migrate to Lambda
4. **Database**: MongoDB Atlas - ✅ Keep

### Service URLs to Document
- Render API URL: [Document from Render dashboard]
- Google Cloud Functions URLs: [Document from GCP console]
- Current webhook endpoints configured in GitLab

### Migration Timeline
- **Preparation**: 1-2 days
- **Lambda Setup**: 2-3 days  
- **Testing**: 1-2 days
- **Cutover**: 1 day
- **Cleanup**: 1 day

## Rollback Plan
1. Keep Render service running during migration
2. Update DNS/environment variables to point back if needed
3. Maintain Google Cloud Functions as backup initially

## Contact Information
- MongoDB Atlas: [Account details]
- Render: [Account details] 
- Google Cloud: [Project details]
- AWS: [Account details]
