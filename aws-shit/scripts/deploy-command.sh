#!/bin/bash

# SAM Deploy Command with automatic ECR repository resolution
sam deploy \
  --stack-name secure-flow-api-v2 \
  --region ap-south-1 \
  --profile personal \
  --capabilities CAPABILITY_IAM \
  --resolve-image-repos \
  --resolve-s3 \
  --parameter-overrides \
    MongoDBURI="mongodb+srv://veerdosi00:veerveer@cluster0.mavhzaj.mongodb.net/Secure-Flow?retryWrites=true&w=majority&appName=Cluster0" \
    JWTSecret="edaed40c257658ca7ec6930884b888a713cfd97024aa5b8d68905ea41670b692a9ae3eae3ea824d8bd5204cd1a0afbc56d6f3344f32f6787723086fa547e72b4" \
    GeminiAPIKey="AIzaSyAmscjuIGG7gz7T_5K8aXw-KD0VkSpxakw" \
    GoogleClientID="714013846272-cndmh92r1uogrembg4ii5opuaj7bcpu3.apps.googleusercontent.com" \
    GoogleClientSecret="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" \
    ClientURL="https://secure-flow-landing.vercel.app" \
  --no-confirm-changeset
