# --------------------
# Este archivo Python contiene funciones auxiliares para el
# control de TurtleBot3 desde peticiones recibidas por la API Nexo
# Autor: Jaime Varas Cáceres
# --------------------

import rospy
from geometry_msgs.msg import Twist
import time


def move(distance=1.0, speed=0.2, reverse=False):
    pub = rospy.Publisher('/cmd_vel', Twist, queue_size=10)
    rospy.init_node('backward_mover', anonymous=True)

    move_cmd = Twist()

    reverseFact = -1 if reverse else 1
    move_cmd.linear.x = reverseFact * abs(speed)  # Velocidad negativa → hacia atrás

    duration = distance / abs(speed)

    rate = rospy.Rate(10)  # 10 Hz
    start_time = rospy.Time.now().to_sec()

    while rospy.Time.now().to_sec() - start_time < duration:
        pub.publish(move_cmd)
        rate.sleep()

    # Parar el robot
    move_cmd.linear.x = 0
    pub.publish(move_cmd)
