# Use Amazon Linux as the base image
FROM amazonlinux:2

# Set the working directory
WORKDIR /app

# Install Java (OpenJDK 17 or 11 depending on your app's requirements)

#amazon-linux-extras enable corretto8 && \
RUN yum update -y && \
    yum install -y java-17-amazon-corretto-headless && \
    yum clean all

# Copy the Spring Boot JAR file into the image
COPY target/*.jar /app/my-springboot-integrationt-test.jar

# Expose the port your Spring Boot application listens on
EXPOSE 8080

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "/app/my-springboot-integration-test.jar"]