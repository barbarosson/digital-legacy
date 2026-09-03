export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  friend_code: string;
  created_at: string;
};

export type ConnectionStatus = "pending" | "accepted" | "blocked";

export type Connection = {
  id: number;
  requester: string;
  addressee: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: number;
  author: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type PostComment = {
  id: number;
  post_id: number;
  author: string;
  content: string;
  created_at: string;
};

export type DirectMessage = {
  id: number;
  sender: string;
  recipient: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export type NotificationType =
  | "friend_request"
  | "friend_accept"
  | "reaction"
  | "comment"
  | "message";

export type AppNotification = {
  id: number;
  user_id: string;
  actor: string | null;
  type: NotificationType;
  entity_id: number | null;
  content: string | null;
  read_at: string | null;
  created_at: string;
};
