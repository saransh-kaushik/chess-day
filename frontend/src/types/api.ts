export interface User {
  id: string;
  username: string;
  isGuest: boolean;
  rating?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
