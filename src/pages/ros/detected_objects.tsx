import {useEffect, useState} from 'react';
// @ts-expect-error test
import ROSLIB from 'roslib';
import '@picocss/pico/css/pico.min.css';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Marker {
  header: {
    frame_id: string;
    stamp: {
      sec: number;
      nsec: number;
    };
  };
  id: number;
  type: number;
  action: number;
  pose: {
    position: Vector3;
    orientation: Quaternion;
  };
  scale: Vector3;
  color: Color;
  text?: string;
  ns?: string;
}

export default function DetectedObjects() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize ROS connection and topic subscription
  useEffect(() => {
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://localhost:9090' // ROS Bridge WebSocket URL
    });

    rosInstance.on('connection', () => {
      console.log('Connected to ROS Bridge');
      setConnected(true);
      setError(null);
    });

    rosInstance.on('error', (err: { message: never; }) => {
      console.error('ROS connection error:', err);
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });

    rosInstance.on('close', () => {
      console.log('ROS connection closed');
      setConnected(false);
    });

    setRos(rosInstance);

    // Cleanup on unmount
    return () => {
      rosInstance.close();
    };
  }, []);

  // Subscribe to topic when connected
  useEffect(() => {
    if (!ros || !connected) return;

    const markerTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/detected_objects_markers',
      messageType: 'visualization_msgs/MarkerArray'
    });

    const callback = (message: { markers: Marker[] }) => {
      setMarkers(message.markers);
    };

    markerTopic.subscribe(callback);

    return () => {
      markerTopic.unsubscribe(callback);
    };
  }, [ros, connected]);

  // Helper function to get marker type as string
  const getMarkerType = (type: number): string => {
    const types = [
      'ARROW', 'CUBE', 'SPHERE', 'CYLINDER', 'LINE_STRIP', 'LINE_LIST',
      'CUBE_LIST', 'SPHERE_LIST', 'POINTS', 'TEXT_VIEW_FACING', 'MESH_RESOURCE', 'TRIANGLE_LIST'
    ];
    return types[type] || `UNKNOWN (${type})`;
  };

  return (
    <div className="container">
      <article>
        <h1>Detected Objects Markers</h1>

        <div className={connected ? 'success' : 'secondary'}>
          <span style={{color: connected ? '#48bb78' : '#e53e3e'}}>●</span> ROS
          Bridge: {connected ? 'Connected' : 'Disconnected'}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="grid">
          {markers.map((marker) => (
            <article key={marker.id} className="ros-marker-card">
              <header>
                <hgroup>
                  <h2>{marker.ns || 'Marker'} #{marker.id}</h2>
                  <h3>{getMarkerType(marker.type)}</h3>
                </hgroup>
              </header>
              <table>
                <tbody>
                <tr>
                  <th>Position</th>
                  <td>{`(${marker.pose.position.x}, ${marker.pose.position.y}, ${marker.pose.position.z})`}</td>
                </tr>
                <tr>
                  <th>Color</th>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      width: '1rem',
                      height: '1rem',
                      backgroundColor: `rgba(${marker.color.r * 255}, ${marker.color.g * 255}, ${marker.color.b * 255}, ${marker.color.a})`
                    }}></span>
                  </td>
                </tr>
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </article>
    </div>
  );
}