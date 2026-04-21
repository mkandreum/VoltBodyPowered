const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface WorkoutLogDTO {
  date: string;
  exerciseId: string;
  weight: number;
  reps: number;
}

export interface ProgressPhotoDTO {
  date: string;
  url: string;
}

function getHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export const workoutService = {
  async getLogs(token: string) {
    const response = await fetch(`${API_URL}/workout/logs`, {
      headers: getHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Failed to get workout logs');
    }

    return response.json();
  },

  async addLog(token: string, data: WorkoutLogDTO) {
    const response = await fetch(`${API_URL}/workout/logs`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to add workout log');
    }

    return response.json();
  },

  async getPhotos(token: string) {
    const response = await fetch(`${API_URL}/workout/photos`, {
      headers: getHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Failed to get progress photos');
    }

    return response.json();
  },

  async addPhoto(token: string, data: ProgressPhotoDTO) {
    const response = await fetch(`${API_URL}/workout/photos`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to add progress photo');
    }

    return response.json();
  },
};
