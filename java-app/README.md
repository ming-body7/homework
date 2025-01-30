# Spring Boot Demo Application

This is a basic Spring Boot application created with Maven build tool.

## Requirements
- Java 17 or higher
- Maven 3.6.x or higher

## Building the Application
```bash
mvn clean install
```

## Running the Application
```bash
mvn spring-boot:run
```

or after building:
```bash
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

## Testing
```bash
mvn test
```
## generate report:
mvn clean test
mvn jacoco:report



## Project Structure
- `src/main/java` - Application source code
- `src/main/resources` - Configuration files
- `src/test/java` - Test source code
- `pom.xml` - Maven project configuration