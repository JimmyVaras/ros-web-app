# Reconocimiento de objetos simulados en el entorno Gazebo/ROS

**Realizado por**: Jaime Varas Cáceres

**Dirigido por**: Fernando Díaz del Río

**Versión ROS usada**: Noetic Ninjemys

**Modelo TurtleBot3** usado: TB3 Waffle Pi con cámara de profundidad añadida (en [/jimmy_simulations_pkg/docs/](https://github.com/JimmyVaras/jimmy_turtlebot3_pkg/blob/master/jimmy_simulations_pkg/docs/turtlebot3_waffle_pi.gazebo.xacro))

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
