FROM public.ecr.aws/docker/library/node:20-slim

# Copy AWS Lambda Web Adapter binary
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

# Set environment variables for Lambda Adapter
ENV PORT=8080
ENV AWS_LWA_READINESS_CHECK_PROTOCOL=tcp
ENV NODE_ENV=production

WORKDIR "/var/task"

# Copy package files for dependency installation
COPY src/package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY src/ ./

# Build TypeScript to JavaScript
RUN npm run build

# Expose port for local testing
EXPOSE 8080

# Start the Express.js application
CMD ["node", "dist/index.js"]
