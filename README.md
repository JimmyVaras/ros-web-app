# Reconocimiento de objetos simulados en el entorno Gazebo/ROS

**Realizado por**: Jaime Varas Cáceres

**Dirigido por**: Fernando Díaz del Río

## Descripción:

Este paquete contiene el código desarrollado (del sistema ROS) para mi Trabajo de Fin de Grado, de Ingeniería de Software en la Universidad de Sevilla, en 2025. En este proyecto, se desarrolló un aplicación web de control y supervisión remota para el robot con el sistema desarrollado en https://github.com/JimmyVaras/ros-web-app. Permite al usuario interactuar con el robot mediante comandos de voz o botones, visualizar el mapa del entorno, ver las detecciones en tiempo real y enviar objetivos de navegación. 

- **Frontend**: Next.js, TypeScript, PicoCSS.
- **Backend**: FastAPI con comunicación hacia ROS mediante rosbridge y consumo de datos de sensores y detecciones.
- **Características destacadas**:
  - Autenticación de usuarios.
  - Control del robot por comandos de voz.
  - Visualización del mapa y cámara del robot.
  - Sistema de memoria de detecciones y navegación hacia objetos.

## 3 Componentes:

- **Frontend**: Directorio base del repositorio
- **Backend Web App**: (en /backend) Endpoints para la comunicación entre el frontend, la base de datos el sistema ROS a través del túnel protegido.
- **Backend APINexo**: (en /APINexo) Endpoints para la comunicación con el sistema ROS a través de una API convencional. Sus endpoints son una forma sencilla de interactuar con topics de ROS en forma de peticiones HTTP tradicionales.

---

# Remote Control Web Application for ROS Robot

This web application provides a full-featured user interface to remotely monitor and control a mobile robot running **ROS (Robot Operating System)**. It enables real-time video surveillance, interactive navigation, and voice control.

The project is built with a distributed architecture that securely connects a modern web app to a local ROS system.

<img width="2610" height="1865" alt="arquitectura" src="https://github.com/user-attachments/assets/f657c265-66b0-451e-9db9-c8026114429c" />

## ✨ Features

* **Centralized Control Panel**: Main interface for interacting with the robot, with support for multiple robots per user.
* **Secure Authentication**: Login system based on **JWT** to protect access.
* **Real-Time Video**: View the robot’s camera feed via an **MJPEG** stream, with a toggle to enable/disable the stream and save bandwidth.
* **Click-to-Navigate Map**: Send navigation goals to the robot simply by clicking on a 2D map of the environment.
* **Voice Control**: Uses the browser’s `SpeechRecognition` API to interpret natural language commands (e.g., "Go to the chair in the living room").
* **Detected Objects Management**:
    * Displays a list of all objects the robot has detected and stored.
    * Allows sending the robot to any object in the list.
    * Allows deleting detections from the database.
* **Patrol Control**: Start and stop an autonomous patrol routine from the web interface.
* **Responsive Design**: The interface adapts to both desktop and mobile devices.

<img height="400" alt="landing-page" src="https://github.com/user-attachments/assets/e3850890-f59a-446d-ab35-c73cc3560360" />

## 🏛️ Architecture

The system is divided into two main components:

1. **Cloud Application**:
    * **Frontend**: A **Next.js** app deployed on Vercel.
    * **Backend**: A **REST API** built with **FastAPI** (Python) and deployed on Render.
    * **Database**: A **PostgreSQL** database hosted on Supabase, storing user, robot, and detection data.
  
<img height="600" alt="db-schema" src="https://github.com/user-attachments/assets/9347d5e4-76ef-4962-bb6c-c2d0ea173600" />


2. **Local Server (on the robot’s network)**:
    * **Nexo API**: An intermediate component (FastAPI-based API) running on the same machine as ROS. It acts as a bridge, translating HTTP requests into ROS commands via **ROSBridge**.
    * **Secure Tunnel**: A service like **Azure Dev Tunnels** is used to securely expose the `Nexo API` to the Internet, enabling communication with the cloud backend.

## 🛠️ Tech Stack

* **Frontend**: Next.js, React, PicoCSS
* **Backend**: FastAPI (Python), SQLAlchemy, JWT
* **Database**: PostgreSQL
* **Intermediate API (`Nexo API`)**: FastAPI, `roslibpy` for communication with ROSBridge
* **Deployment**: Vercel (Frontend), Render (Backend), Supabase (DB)
* **Secure Communication**: Azure Dev Tunnels

<img height="600" alt="mobile" src="https://github.com/user-attachments/assets/6eb0178c-f59d-46f3-95bc-4487dc4b002e" />


## 📦 Project Structure

This repository is organized as a monorepo with the following main components:

- `/frontend`: Next.js web application code.
- `/backend`: Main FastAPI backend code.
- `/api-nexo`: Intermediate API code that connects to ROS.

## 🚀 Getting Started

### Prerequisites

* Node.js and npm for the frontend
* Python 3.8+ and pip for the backend and Nexo API
* An account with a tunneling service (e.g., Azure Dev Tunnels)
* The [robot’s ROS system](#) (link to your other repository) must be running

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    cd YOUR_REPOSITORY
    ```
2. **Configure each component**:
    * For `frontend`, `backend`, and `api-nexo`, navigate to their respective directories.
    * Create a `.env` file from the `.env.example` and fill in the environment variables (API URLs, secret keys, tunnel token, etc.).
    * Install dependencies:
        ```bash
        # Frontend
        cd frontend && npm install

        # Backend and Nexo API
        cd ../backend && pip install -r requirements.txt
        cd ../api-nexo && pip install -r requirements.txt
        ```

### Running the System

1. **Start the ROS System**: Make sure all robot nodes are running.
2. **Start the Nexo API**: On the robot's machine, run the intermediate API:
    ```bash
    cd api-nexo
    uvicorn main:app --host 0.0.0.0 --port 8001
    ```
3. **Create a Secure Tunnel**: Expose port `8001` of the Nexo API to the Internet using your tunneling service.
4. **Start the Main Backend**: Run it on your server or locally. Ensure that the `NEXO_API_URL` environment variable points to the public URL of your tunnel.
    ```bash
    cd backend
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```
5. **Start the Frontend**:
    ```bash
    cd frontend
    npm run dev
    ```
6. Open your browser at `http://localhost:3000` to access the application.
