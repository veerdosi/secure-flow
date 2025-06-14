# AWS Profile Configuration for SecureFlow Migration

## AWS Profile Setup
- **Profile Name**: personal
- **Region**: ap-south-1 (Mumbai)
- **Account**: 320819923868

## Command Modifications for Profile Usage

All AWS/SAM CLI commands in the migration guide need the `--profile` flag:

### Original Migration Commands:
```bash
aws sts get-caller-identity
sam build
sam deploy --guided
```

### Your Profile-Specific Commands:
```bash
aws sts get-caller-identity --profile personal
sam build
sam deploy --guided --profile personal
```

## Environment Variable Alternative

You can also set the profile as default for your terminal session:

```bash
export AWS_PROFILE=personal
# Now all aws/sam commands will use the personal profile automatically
```

## Region-Specific Considerations

### ap-south-1 (Mumbai) Advantages:
- Lowest latency for Indian users
- Data residency compliance
- Local timezone alignment

### Services Available in ap-south-1:
✅ AWS Lambda
✅ API Gateway  
✅ CloudWatch
✅ SQS
✅ Secrets Manager
✅ ECR (for container images)

All services required for SecureFlow migration are available in your chosen region.

## Next Phase Ready Checklist:
- [x] AWS credentials configured
- [x] Region selected (ap-south-1)
- [x] Profile setup (personal)
- [ ] SAM CLI installed and verified
- [ ] Docker running and verified
- [ ] First Lambda function deployment ready
