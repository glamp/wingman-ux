# Test that wingman-cli works with npx in a clean environment
FROM node:20

# Set working directory
WORKDIR /test

# Copy test script
COPY test-wingman.sh /test/test-wingman.sh
RUN chmod +x /test/test-wingman.sh

# Run the test
CMD ["/test/test-wingman.sh"]