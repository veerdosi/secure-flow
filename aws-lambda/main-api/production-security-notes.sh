# Migration to AWS Secrets Manager
# This approach provides better security for production environments

# 1. Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "secure-flow/mongodb-uri" \
  --secret-string "mongodb+srv://..." \
  --profile personal \
  --region ap-south-1

# 2. Update SAM template to reference secrets
# Instead of direct parameter values, use:
# Environment:
#   Variables:
#     MONGODB_URI: !Sub "{{resolve:secretsmanager:secure-flow/mongodb-uri:SecretString}}"
