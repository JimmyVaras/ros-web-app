import rospy
from geometry_msgs.msg import Twist
import time

# Solo una vez
if not rospy.core.is_initialized():
    rospy.init_node('nexo_controller', anonymous=True)


def move(distance=1.0, speed=0.2, reverse=False):
    pub = rospy.Publisher('/cmd_vel', Twist, queue_size=10)
    move_cmd = Twist()

    reverseFact = -1 if reverse else 1
    move_cmd.linear.x = reverseFact * abs(speed)

    duration = distance / abs(speed)
    rate = rospy.Rate(10)
    start_time = rospy.Time.now().to_sec()

    while rospy.Time.now().to_sec() - start_time < duration:
        pub.publish(move_cmd)
        rate.sleep()

    move_cmd.linear.x = 0
    pub.publish(move_cmd)


def turn(direction="left", angular_speed=0.5):
    pub = rospy.Publisher('/cmd_vel', Twist, queue_size=10)
    move_cmd = Twist()

    if direction == "left":
        angle = 90
        sign = 1
    elif direction == "right":
        angle = 90
        sign = -1
    elif direction == "back":
        angle = 180
        sign = 1
    else:
        rospy.logerr("Dirección no válida: elige 'left', 'right' o 'back'")
        return

    radians = angle * (3.14159265 / 180)
    duration = radians / angular_speed
    move_cmd.angular.z = sign * abs(angular_speed)

    rate = rospy.Rate(10)
    start_time = rospy.Time.now().to_sec()

    while rospy.Time.now().to_sec() - start_time < duration:
        pub.publish(move_cmd)
        rate.sleep()

    move_cmd.angular.z = 0
    pub.publish(move_cmd)
