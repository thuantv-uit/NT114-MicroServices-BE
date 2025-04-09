# Task Management Project

## Introduction
This project is a task management system built using a **microservice architecture**, with **Node.js** as the primary programming language and **MongoDB** as the database. The system consists of 4 main services: **User**, **Board**, **Column**, and **Card**, each running on a separate port.

### Author Information
- **Author**: Trần Văn Thuận  
- **Created Date**: April 09, 2025  

---

## Service Structure

The project is divided into 4 independent microservices:

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

---

## Technologies Used
- **Programming Language**: Node.js  
- **Database**: MongoDB  
- **Architecture**: Microservice  
- **Port Management**: Each service runs on a separate port (3001, 3002, 3003, 3004).  

---

## Prerequisites
- **Node.js**: Version 20.x or higher.  
- **MongoDB**: Version 4.x or higher.  
- **npm**: Node.js package manager.  

---

## Installation and Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <project-folder>

### 2. Install Dependencies for Each Service
npm install

### 3. Configure Environment Variables
PORT=<port_number>  # 3001 for user, 3002 for board, etc.
MONGODB_URI=<your_mongodb_connection_string>

### 4. Start MongoDB
mongod

### 5. Run Each Service
cd user && npm start
cd board && npm start
cd column && npm start
cd card && npm start

Usage
Access each service via their respective ports:
User Service: http://localhost:3001
Board Service: http://localhost:3002
Column Service: http://localhost:3003
Card Service: http://localhost:3004
Use the APIs defined in each service to interact with the system.

Feedback and Contact
If you have any questions or suggestions, feel free to reach out to the author:

Email: 22521448@gm.uit.edu.vn
GitHub: github.com/thuan410