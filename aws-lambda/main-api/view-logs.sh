#!/bin/bash

# View recent CloudWatch logs for the Lambda function
aws logs tail \
  /aws/lambda/secure-flow-api-v2-SecureFlowMainAPI-fSe0mC18ZcDb \
  --follow \
  --profile personal \
  --region ap-south-1
