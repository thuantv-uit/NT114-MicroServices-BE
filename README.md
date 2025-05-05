# Task Management Project

## Introduction
This project is a task management system built using a **microservice architecture**, with **Node.js** as the primary programming language and **MongoDB** as the database. The system consists of 4 main services: **User**, **Board**, **Column**, and **Card**, each running on a separate port.

### Author Information
- **Author**: Thuan Tran Van  
- **Created Date**: April 09, 2025  

---

## Service Structure

The project is divided into 5 independent microservices:

- **User Service**  
  - **Description**: Manages user information (registration, login, profile updates, etc.).  
  - **Port**: `3001`  
  - **Main Functionality**: Handles authentication and account management.

- **Board Service**  
  - **Description**: Manages task boards (create, edit, delete boards).  
  - **Port**: `3002`  
  - **Main Functionality**: Organizes tasks into boards.

- **Column Service**  
  - **Description**: Manages columns within boards (create, update, delete columns).  
  - **Port**: `3003`  
  - **Main Functionality**: Categorizes tasks within boards.

- **Card Service**  
  - **Description**: Manages task cards (create, edit, delete cards).  
  - **Port**: `3004`  
  - **Main Functionality**: Details specific tasks.

- **Invitation Service**  
  - **Description**: Manages invitations for boards (create, send, accept invitations).  
  - **Port**: `3005`  
  - **Main Functionality**: Handles board collaboration invitations.
  
---

## Technologies Used
- **Programming Language**: Node.js  
- **Database**: MongoDB  
- **Architecture**: Microservice  
- **Port Management**: Each service runs on a separate port (3001, 3002, 3003, 3004, 3005).  

---

## Prerequisites
- **Node.js**: Version 20.x or higher.  
- **MongoDB**: Version 4.x or higher.  
- **npm**: Node.js package manager.  

---

## Installation and Setup


### 1. Clone the Repository

```bash
git clone https://github.com/thuan410/NT114_MicroServices_BE.git
cd NT114_MicroServices_BE
```

### 2. Install Dependencies for Each Service

```bash
npm install
```

### 3. Configure Environment Variables

```bash
PORT=<port_number>  # 3001 for user, 3002 for board, etc.
MONGODB_URI=<your_mongodb_connection_string>
```

### 4. Start MongoDB

```bash
mongod
```

### 5. Run Each Service

```bash
cd user-service && npm start
cd board-service && npm start
cd column-service && npm start
cd card-service && npm start
cd notification-service && npm start
```

### Usage

Access each service via their respective ports:
User Service: http://localhost:3001
Board Service: http://localhost:3002
Column Service: http://localhost:3003
Card Service: http://localhost:3004
Invitation Service: http://localhost:3005
Use the APIs defined in each service to interact with the system.

### Feedback and Contact

If you have any questions or suggestions, feel free to reach out to the author:

Email: 22521448@gm.uit.edu.vn
GitHub: github.com/thuan410
