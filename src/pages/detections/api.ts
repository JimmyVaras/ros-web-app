export interface Detection {
    id: number;
    label: string;
    position: string;
}

export async function getDetections(): Promise<Detection[]> {
    const response = await fetch('http://localhost:8000/objects/');
    if (!response.ok) {
        throw new Error('Failed to fetch detections');
    }
    return await response.json();
}

export async function createDetection(detection: Omit<Detection, 'id'>): Promise<Detection> {
    const response = await fetch('http://localhost:8000objects/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(detection),
    });
    if (!response.ok) {
        throw new Error('Failed to create detection');
    }
    return await response.json();
}