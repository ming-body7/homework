# High-Level Design Document

## 1. Problem Statement

Detect transaction fraud in realtime

## 2. Requirements

### 2.1 Functional Requirements

- Use a queue to receive transactions.
- Detect fraudulent transactions.
- Send out alarms or notify certain stakeholder for detected fraud.
- Enable logging for system activities.

### 2.2 Non-Functional Requirements

- **Scalability**: Auto-scaling enabled.
- **Security**: Encryption, Authentication, and Authorization.
- **Observability**: Centralized logging & metrics.
- **Performance**: Response times under [X] ms.
- **Low Latency**: Ensure minimal delay in processing transactions.

### 2.3 Out of Scope

Team will stick with K8S eco-system

## 3. High-Level Architecture

### 3.1 System Architecture
![Alt Text](images/HLD.drawio.png)


The system follows an event-driven microservices architecture. The major components include:

- **Backend**: Spring Boot application listening to AWS SQS, processing transactions, and emitting metrics.
- **Message Queue**: AWS SQS for asynchronous processing.
- **Monitoring & Logging**: AWS CloudWatch for metrics and logs.
- **Alerting**: AWS SNS for notifying alarms triggered by CloudWatch metrics.

### 3.2 Deployment Architecture

The application will be deployed using:

- **Cloud Provider**: AWS
- **Containerization**: Docker
- **Orchestration**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions/Jenkins
- **Logging**: Fluent-bit for log collection and forwarding to CloudWatch.

## 4. Data Flow

1. Transactions arrive in AWS SQS.
2. Spring Boot backend consumes transactions from SQS and processes them.
3. Metrics are emitted to CloudWatch.
4. CloudWatch monitors the metrics and triggers alarms for anomalies.
5. AWS SNS sends notifications upon alarm triggers.
6. Logs are collected using Fluent-bit and stored in CloudWatch for analysis.

## 5. Key Decisions

- **Spring Boot listens to AWS SQS** for transaction processing.
    - *Pros*: Reliable message delivery, decoupled architecture.
    - *Cons*: Potential latency if SQS backlog increases.
- **Metrics are emitted to AWS CloudWatch** to track system performance and fraud detection.
    - *Pros*: Centralized monitoring, integration with AWS services.
    - *Cons*: Additional cost for storage and querying.
- **CloudWatch triggers alarms** based on pre-defined thresholds.
    - *Pros*: Automated monitoring and alerting.
    - *Cons*: Requires fine-tuning to avoid false alarms.
- **AWS SNS is used for notifications** in case of detected fraud.
    - *Pros*: Real-time notification delivery.
    - *Cons*: Possible delays in high-traffic scenarios.
- **Logging is handled using Fluent-bit and CloudWatch** to ensure observability.
    - *Pros*: Lightweight, scalable logging solution.
    - *Cons*: Additional configuration required for optimized log retention.
- **The tech stack is containerized and deployed on Kubernetes (EKS)** for scalability and manageability.
    - *Pros*: High availability, easy scaling.
    - *Cons*: Complexity in cluster management.
- **AWS FIS is integrated for resilience testing and managed by CDK** to simulate failures and test system robustness.
    - *Pros*: Easy to implement chaos engineering practices.
    - *Cons*: Requires careful planning to avoid unintended disruptions.
- **AWS stack is used** because it is the largest cloud provider, supports globalization, has a mutual development community, and aligns with the team’s tech background.
    - *Pros*: Best-in-class cloud services, strong ecosystem.
    - *Cons*: Vendor lock-in risks.

## 6. Component Design

### 6.1 Backend

- Framework: Spring Boot
- Message Queue: AWS SQS
- Authentication: JWT/OAuth
- Caching: Redis
- Logging & Monitoring: Fluent-bit + CloudWatch

### 6.2 Message Queue

- Message Producers & Consumers
- AWS SQS Integration
- Error Handling & Retry Mechanisms

## 7. Future Improvements

- Enable CI/CD for automated deployments and testing.
- Enrich monitor and alarm like SQS age
- Call external service for alarm

