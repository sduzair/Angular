# Dockerfile
FROM mongo:8.0.9

# Copy the users data file and initialization script into the container
COPY usersData.json /docker-entrypoint-initdb.d/
COPY init.sh /docker-entrypoint-initdb.d/

# Ensure the initialization script is executable
RUN chmod +x /docker-entrypoint-initdb.d/init.sh

